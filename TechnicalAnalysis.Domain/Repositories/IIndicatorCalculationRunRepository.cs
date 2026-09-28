using TechnicalAnalysis.Domain.Indicators;

namespace TechnicalAnalysis.Domain.Repositories;

public interface IIndicatorCalculationRunRepository
{
	Task<long> StartAsync(
		DateOnly calculationDate,
		long indicatorConfigurationId,
		string libraryVersion,
		CancellationToken cancellationToken = default);

	Task CompleteAsync(
		long calculationRunId,
		long rowsCalculated,
		CancellationToken cancellationToken = default);

	Task FailAsync(
		long calculationRunId,
		string errorMessage,
		CancellationToken cancellationToken = default);
}