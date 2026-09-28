using Npgsql;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Domain.Repositories;

namespace TechnicalAnalysis.Infrastructure.PostgreSql;

public sealed class IndicatorEodRepository
	: IIndicatorEodRepository
{
	private readonly NpgsqlDataSource _dataSource;

	public IndicatorEodRepository(
		NpgsqlDataSource dataSource)
	{
		_dataSource = dataSource;
	}

	public async Task BulkUpsertAsync(
		long listingId,
		IndicatorCalculationResult result,
		CancellationToken cancellationToken = default)
	{
		await using var connection =
			await _dataSource.OpenConnectionAsync(
				cancellationToken);

		await using var transaction =
			await connection.BeginTransactionAsync(
				cancellationToken);

		const string createTempTable = """
            create temporary table tmp_indicator_eod
            (
                listing_id bigint not null,
                price_date date not null,
                indicator_configuration_id bigint not null,
                value_1 double precision,
                value_2 double precision,
                value_3 double precision,
                value_4 double precision,
                calculated_at timestamptz not null
            )
            on commit drop;
            """;

		await using (
			var command = new NpgsqlCommand(
				createTempTable,
				connection,
				transaction))
		{
			await command.ExecuteNonQueryAsync(
				cancellationToken);
		}

		await using (
			var importer =
				await connection.BeginBinaryImportAsync(
					"""
                    copy tmp_indicator_eod
                    (
                        listing_id,
                        price_date,
                        indicator_configuration_id,
                        value_1,
                        value_2,
                        value_3,
                        value_4,
                        calculated_at
                    )
                    from stdin (format binary)
                    """,
					cancellationToken))
		{
			foreach (var value in result.Values)
			{
				await importer.StartRowAsync(
					cancellationToken);

				await importer.WriteAsync(
					listingId,
					NpgsqlTypes.NpgsqlDbType.Bigint,
					cancellationToken);

				await importer.WriteAsync(
					DateOnly.FromDateTime(value.Date),
					NpgsqlTypes.NpgsqlDbType.Date,
					cancellationToken);

				await importer.WriteAsync(
					result.IndicatorConfigurationId,
					NpgsqlTypes.NpgsqlDbType.Bigint,
					cancellationToken);

				await importer.WriteAsync(
					value.Value1,
					NpgsqlTypes.NpgsqlDbType.Double,
					cancellationToken);

				await importer.WriteAsync(
					value.Value2,
					NpgsqlTypes.NpgsqlDbType.Double,
					cancellationToken);

				await importer.WriteAsync(
					value.Value3,
					NpgsqlTypes.NpgsqlDbType.Double,
					cancellationToken);

				await importer.WriteAsync(
					value.Value4,
					NpgsqlTypes.NpgsqlDbType.Double,
					cancellationToken);

				await importer.WriteAsync(
					DateTime.UtcNow,
					NpgsqlTypes.NpgsqlDbType.TimestampTz,
					cancellationToken);
			}

			await importer.CompleteAsync(
				cancellationToken);
		}

		const string mergeSql = """
            insert into technical.indicator_eod
            (
                listing_id,
                price_date,
                indicator_configuration_id,
                value_1,
                value_2,
                value_3,
                value_4,
                calculated_at
            )
            select
                listing_id,
                price_date,
                indicator_configuration_id,
                value_1,
                value_2,
                value_3,
                value_4,
                calculated_at
            from tmp_indicator_eod
            on conflict
            (
                listing_id,
                price_date,
                indicator_configuration_id
            )
            do update
            set
                value_1 = excluded.value_1,
                value_2 = excluded.value_2,
                value_3 = excluded.value_3,
                value_4 = excluded.value_4,
                calculated_at = excluded.calculated_at;
            """;

		await using (
			var command = new NpgsqlCommand(
				mergeSql,
				connection,
				transaction))
		{
			await command.ExecuteNonQueryAsync(
				cancellationToken);
		}

		await transaction.CommitAsync(
			cancellationToken);
	}

	public Task UpsertAsync(long listingId, IndicatorCalculationResult result, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
	{
		throw new NotImplementedException();
	}
}