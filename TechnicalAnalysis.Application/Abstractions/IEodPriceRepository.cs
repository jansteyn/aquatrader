using TechnicalAnalysis.Domain.Series;

namespace TechnicalAnalysis.Application.Abstractions;

public interface IEodPriceRepository
{
	Task<IReadOnlyList<EodPrice>> GetAsync(
		long listingId,
		DateOnly fromDate,
		DateOnly toDate,
		CancellationToken cancellationToken = default);
}