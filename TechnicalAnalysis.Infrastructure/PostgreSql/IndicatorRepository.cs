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
			OutputCount = reader.GetInt16(4),
			IsActive = reader.GetBoolean(5)
		};
	}

	public Task<IndicatorConfiguration?> GetConfigurationAsync(string indicatorCode, string parametersJson, CancellationToken cancellationToken = default)
	{
		throw new NotImplementedException();
	}
}