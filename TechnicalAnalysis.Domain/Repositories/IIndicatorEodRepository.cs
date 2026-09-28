using TechnicalAnalysis.Domain.Results;

namespace TechnicalAnalysis.Domain.Repositories;

public interface IIndicatorEodRepository
{
	Task UpsertAsync(
		long listingId,
		IndicatorCalculationResult result,
		DateOnly fromDate,
		DateOnly toDate,
		CancellationToken cancellationToken = default);
	Task BulkUpsertAsync(
	 long listingId,
	 IndicatorCalculationResult result,
	 CancellationToken cancellationToken = default);
}