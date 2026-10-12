using AquaTrader.Api.Services;
using Microsoft.Extensions.Options;
using Npgsql;
using Npgsql.Replication;
using Npgsql.Replication.PgOutput;
using Npgsql.Replication.PgOutput.Messages;
using TechnicalAnalysis.Application;
using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Application.Services;
using TechnicalAnalysis.Domain.Indicators;
using TechnicalAnalysis.Domain.Repositories;

namespace AquaTrader.Api.Services;

public sealed class PriceEodReplicationWorker(
	IConfiguration configuration,
	IOptions<PriceEodReplicationOptions> options,
	IServiceScopeFactory scopeFactory,
	NpgsqlDataSource dataSource,
	ILogger<PriceEodReplicationWorker> logger)
	: BackgroundService
{
	private readonly PriceEodReplicationOptions _options = options.Value;
	private readonly string _connectionString =
		configuration.GetConnectionString("TechnicalAnalysis")
		?? throw new InvalidOperationException(
			"ConnectionStrings:TechnicalAnalysis is required when price replication is enabled.");

	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		while (!stoppingToken.IsCancellationRequested)
		{
			try
			{
				await ReplicateAsync(stoppingToken);
			}
			catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
			{
				break;
			}
			catch (Exception exception)
			{
				logger.LogError(
					exception,
					"Price EOD logical replication failed. Retrying in {DelaySeconds} seconds.",
					_options.ReconnectDelaySeconds);

				await Task.Delay(
					TimeSpan.FromSeconds(_options.ReconnectDelaySeconds),
					stoppingToken);
			}
		}
	}

	private async Task ReplicateAsync(CancellationToken cancellationToken)
	{
		await using var connection =
			new LogicalReplicationConnection(_connectionString);

		await connection.Open(cancellationToken);
		var slot = await EnsureSlotAsync(connection, cancellationToken);
		var options = new PgOutputReplicationOptions(
			_options.PublicationName,
			PgOutputProtocolVersion.V1);
		var changedPrices = new HashSet<PriceEodKey>();

		logger.LogInformation(
			"Starting logical replication from publication {PublicationName} and slot {SlotName}.",
			_options.PublicationName,
			_options.SlotName);

		await foreach (var message in connection.StartReplication(
			slot,
			options,
			cancellationToken).WithCancellation(cancellationToken))
		{
			switch (message)
			{
				case InsertMessage insert:
					await AddChangedPriceAsync(
						changedPrices,
						insert.Relation,
						insert.NewRow,
						cancellationToken);
					break;

				case UpdateMessage update:
					await AddChangedPriceAsync(
						changedPrices,
						update.Relation,
						update.NewRow,
						cancellationToken);
					break;

				case CommitMessage:
					await CalculateIndicatorsAsync(
						changedPrices,
						cancellationToken);
					changedPrices.Clear();
					connection.SetReplicationStatus(message.WalEnd);
					break;
			}
		}

		throw new IOException("The logical replication stream ended unexpectedly.");
	}

	private async Task<PgOutputReplicationSlot> EnsureSlotAsync(
		LogicalReplicationConnection replicationConnection,
		CancellationToken cancellationToken)
	{
		await using var connection =
			await dataSource.OpenConnectionAsync(cancellationToken);

		await using var command = new NpgsqlCommand(
			"""
            select plugin
            from pg_replication_slots
            where slot_name = $1;
            """,
			connection);
		command.Parameters.AddWithValue(_options.SlotName);

		var existingPlugin =
			(string?)await command.ExecuteScalarAsync(cancellationToken);

		if (existingPlugin is not null)
		{
			if (!string.Equals(existingPlugin, "pgoutput", StringComparison.Ordinal))
			{
				throw new InvalidOperationException(
					$"Replication slot '{_options.SlotName}' uses '{existingPlugin}' instead of 'pgoutput'.");
			}

			return new PgOutputReplicationSlot(_options.SlotName);
		}

		logger.LogInformation(
			"Creating logical replication slot {SlotName}.",
			_options.SlotName);

		return await replicationConnection.CreatePgOutputReplicationSlot(
			_options.SlotName,
			cancellationToken: cancellationToken);
	}

	private static async Task AddChangedPriceAsync(
		ISet<PriceEodKey> changedPrices,
		RelationMessage relation,
		ReplicationTuple tuple,
		CancellationToken cancellationToken)
	{
		if (relation.Namespace != "prices" ||
			relation.RelationName != "price_eod")
		{
			return;
		}

		var listingIdIndex = FindColumnIndex(relation, "listing_id");
		var priceDateIndex = FindColumnIndex(relation, "price_date");
		long? listingId = null;
		DateOnly? priceDate = null;
		var index = 0;

		await foreach (var value in tuple.WithCancellation(cancellationToken))
		{
			if (index == listingIdIndex)
			{
				listingId = await value.Get<long>(cancellationToken);
			}
			else if (index == priceDateIndex)
			{
				priceDate = await value.Get<DateOnly>(cancellationToken);
			}

			index++;
		}

		if (listingId is null || priceDate is null)
		{
			throw new InvalidOperationException(
				"The price_eod replication publication must include listing_id and price_date.");
		}

		changedPrices.Add(new PriceEodKey(listingId.Value, priceDate.Value));
	}

	private static int FindColumnIndex(
		RelationMessage relation,
		string columnName)
	{
		for (var index = 0; index < relation.Columns.Count; index++)
		{
			if (relation.Columns[index].ColumnName == columnName)
			{
				return index;
			}
		}

		throw new InvalidOperationException(
			$"The price_eod replication publication did not include column '{columnName}'.");
	}

	private async Task CalculateIndicatorsAsync(
		IReadOnlyCollection<PriceEodKey> changedPrices,
		CancellationToken cancellationToken)
	{
		if (changedPrices.Count == 0)
		{
			return;
		}

		await using var scope = scopeFactory.CreateAsyncScope();
		var indicatorRepository =
			scope.ServiceProvider.GetRequiredService<IIndicatorRepository>();
		var priceRepository =
			scope.ServiceProvider.GetRequiredService<IEodPriceRepository>();
		var technicalAnalysisService =
			scope.ServiceProvider.GetRequiredService<TechnicalAnalysisService>();
		var configurations =
			await indicatorRepository.GetConfigurationsToRunAsync(cancellationToken);

		foreach (var changedPrice in changedPrices)
		{
			var range = await priceRepository.GetCalculationRangeAsync(
				changedPrice.ListingId,
				changedPrice.PriceDate,
				_options.WarmupPeriods,
				cancellationToken);

			if (range is null)
			{
				logger.LogWarning(
					"No prices found for listing {ListingId} on or before {PriceDate}.",
					changedPrice.ListingId,
					changedPrice.PriceDate);
				continue;
			}

			foreach (var configuration in configurations)
			{
				var request = new CalculateIndicatorRequest
				{
					ListingId = changedPrice.ListingId,
					IndicatorConfigurationId = configuration.IndicatorConfigurationId,
					IndicatorCode = configuration.IndicatorCode,
					ParametersJson = configuration.ParametersJson,
					FromDate = range.FromDate,
					ToDate = range.ToDate,
					WarmupPeriods = _options.WarmupPeriods
				};

				await technicalAnalysisService.CalculateAsync(
					request,
					cancellationToken);
			}
		}
	}

	private readonly record struct PriceEodKey(long ListingId, DateOnly PriceDate);
}
