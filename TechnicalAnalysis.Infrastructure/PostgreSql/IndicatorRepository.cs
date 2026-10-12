using System.Text.Json;
using Npgsql;
using TechnicalAnalysis.Domain.Indicators;
using TechnicalAnalysis.Domain.Repositories;

namespace TechnicalAnalysis.Infrastructure.PostgreSql;

public sealed class IndicatorRepository
	: IIndicatorRepository
{
	private readonly NpgsqlDataSource _dataSource;

	public IndicatorRepository(
		NpgsqlDataSource dataSource)
	{
		_dataSource = dataSource;
	}

	public async Task<Indicator?> GetByCodeAsync(
		string code,
		CancellationToken cancellationToken = default)
	{
		const string sql = """
            select
                indicator_id,
                code,
                name,
                description,
                provider_name,
                output_count,
                is_active
            from technical.indicator
            where code = $1;
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(
				cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		command.Parameters.AddWithValue(
			code);

		await using var reader =
			await command.ExecuteReaderAsync(
				cancellationToken);

		if (!await reader.ReadAsync(cancellationToken))
			return null;

		return new Indicator
		{
			// See note below regarding private setters.
			Code = reader.GetString(1),
			Name = reader.GetString(2),
			Description = reader.IsDBNull(3)
				? null
				: reader.GetString(3),
			ProviderName = reader.GetString(4),
			OutputCount = reader.GetInt16(5),
			IsActive = reader.GetBoolean(6)
		};
	}

	public Task<IndicatorConfiguration?> GetConfigurationAsync(string indicatorCode, string parametersJson, CancellationToken cancellationToken = default)
	{
		throw new NotImplementedException();
	}

	public async Task<IReadOnlyList<IndicatorConfigurationToRun>> GetConfigurationsToRunAsync(
		CancellationToken cancellationToken = default)
	{
		const string sql = """
            select
                ic.indicator_configuration_id,
                i.code,
                ic.parameters::text
            from technical.indicator_configuration ic
            join technical.indicator i
              on i.indicator_id = ic.indicator_id
            where i.is_active
            order by i.indicator_id, ic.indicator_configuration_id;
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		var configurations = new List<IndicatorConfigurationToRun>();

		await using var reader =
			await command.ExecuteReaderAsync(cancellationToken);

		while (await reader.ReadAsync(cancellationToken))
		{
			configurations.Add(new IndicatorConfigurationToRun
			{
				IndicatorConfigurationId = reader.GetInt64(0),
				IndicatorCode = reader.GetString(1),
				ParametersJson = reader.GetString(2)
			});
		}

		return configurations;
	}
}