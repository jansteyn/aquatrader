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

	public async Task<EodPriceCalculationRange?> GetCalculationRangeAsync(
		long listingId,
		DateOnly changedDate,
		int warmupPeriods,
		CancellationToken cancellationToken = default)
	{
		ArgumentOutOfRangeException.ThrowIfNegativeOrZero(warmupPeriods);

		const string sql = """
            with warmup_prices as
            (
                select price_date
                from prices.price_eod
                where listing_id = $1
                  and price_date <= $2
                order by price_date desc
                limit $3
            )
            select
                (select min(price_date) from warmup_prices),
                (select max(price_date)
                 from prices.price_eod
                 where listing_id = $1);
            """;

		await using var connection =
			await _dataSource.OpenConnectionAsync(cancellationToken);

		await using var command =
			new NpgsqlCommand(sql, connection);

		command.Parameters.AddWithValue(listingId);
		command.Parameters.AddWithValue(changedDate);
		command.Parameters.AddWithValue(checked(warmupPeriods + 1));

		await using var reader =
			await command.ExecuteReaderAsync(cancellationToken);

		if (!await reader.ReadAsync(cancellationToken) ||
			reader.IsDBNull(0) ||
			reader.IsDBNull(1))
		{
			return null;
		}

		return new EodPriceCalculationRange(
			reader.GetFieldValue<DateOnly>(0),
			reader.GetFieldValue<DateOnly>(1));
	}
}