using Npgsql;
using NpgsqlTypes;
using TechnicalAnalysis.Domain.Repositories;

namespace TechnicalAnalysis.Infrastructure.PostgreSql;

public sealed class IndicatorCalculationRunRepository
	: IIndicatorCalculationRunRepository
{
	private readonly NpgsqlDataSource _dataSource;

	public IndicatorCalculationRunRepository(
		NpgsqlDataSource dataSource)
	{
		_dataSource = dataSource;
	}

	public async Task<long> StartAsync(
		DateOnly calculationDate,
		long indicatorConfigurationId,
		string libraryVersion,
		CancellationToken cancellationToken = default)
	{
		const string sql = """
            insert into technical.indicator_calculation_run
            (
                calculation_date,
                indicator_configuration_id,
                library_version,
                status
            )
            values
            (
                $1,
                $2,
                $3,
                'Running'
            )
            returning calculation_run_id;
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(
				cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = calculationDate,
				NpgsqlDbType = NpgsqlDbType.Date
			});

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = indicatorConfigurationId,
				NpgsqlDbType = NpgsqlDbType.Bigint
			});

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = libraryVersion,
				NpgsqlDbType = NpgsqlDbType.Varchar
			});

		var result =
			await command.ExecuteScalarAsync(cancellationToken);

		if (result is null || result is DBNull)
		{
			throw new InvalidOperationException(
				"Failed to create indicator calculation run.");
		}

		return Convert.ToInt64(result);
	}

	public async Task CompleteAsync(
		long calculationRunId,
		long rowsCalculated,
		CancellationToken cancellationToken = default)
	{
		const string sql = """
            update technical.indicator_calculation_run
            set
                status = 'Completed',
                completed_at = now(),
                rows_calculated = $2,
                error_message = null
            where calculation_run_id = $1;
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(
				cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = calculationRunId,
				NpgsqlDbType = NpgsqlDbType.Bigint
			});

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = rowsCalculated,
				NpgsqlDbType = NpgsqlDbType.Bigint
			});

		var affected =
			await command.ExecuteNonQueryAsync(
				cancellationToken);

		if (affected != 1)
		{
			throw new InvalidOperationException(
				$"Indicator calculation run " +
				$"{calculationRunId} was not found.");
		}
	}

	public async Task FailAsync(
		long calculationRunId,
		string errorMessage,
		CancellationToken cancellationToken = default)
	{
		const string sql = """
            update technical.indicator_calculation_run
            set
                status = 'Failed',
                completed_at = now(),
                error_message = $2
            where calculation_run_id = $1;
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(
				cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = calculationRunId,
				NpgsqlDbType = NpgsqlDbType.Bigint
			});

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = errorMessage,
				NpgsqlDbType = NpgsqlDbType.Text
			});

		var affected =
			await command.ExecuteNonQueryAsync(
				cancellationToken);

		if (affected != 1)
		{
			throw new InvalidOperationException(
				$"Indicator calculation run " +
				$"{calculationRunId} was not found.");
		}
	}
}