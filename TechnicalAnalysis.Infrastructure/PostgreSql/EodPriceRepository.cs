using Npgsql;
using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Domain.Series;

namespace TechnicalAnalysis.Infrastructure.PostgreSql;

public sealed class EodPriceRepository
	: IEodPriceRepository
{
	private readonly NpgsqlDataSource _dataSource;

	public EodPriceRepository(NpgsqlDataSource dataSource)
	{
		_dataSource = dataSource;
	}

	public async Task<IReadOnlyList<EodPrice>> GetAsync(
		long listingId,
		DateOnly fromDate,
		DateOnly toDate,
		CancellationToken cancellationToken = default)
	{
		const string sql = """
            select
                price_date,
                open_price,
                high_price,
                low_price,
                close_price,
                volume
            from prices.get_eod(
                $1,
                $2,
                $3
            )
            order by price_date;
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(
				cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = listingId,
				NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Bigint
			});

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = fromDate,
				NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Date
			});

		command.Parameters.Add(
			new NpgsqlParameter
			{
				Value = toDate,
				NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Date
			});

		var prices = new List<EodPrice>();

		await using var reader =
			await command.ExecuteReaderAsync(
				cancellationToken);

		while (await reader.ReadAsync(cancellationToken))
		{
			prices.Add(new EodPrice
			{
				Date = reader.GetFieldValue<DateOnly>(0).ToDateTime(new TimeOnly(0, 0, 0)),
				Open = reader.GetDecimal(1),
				High = reader.GetDecimal(2),
				Low = reader.GetDecimal(3),
				Close = reader.GetDecimal(4),
				Volume = reader.GetDecimal(5)
			});
		}

		return prices;
	}
}