using TechnicalAnalysis.Domain.Indicators;

namespace TechnicalAnalysis.Domain.Repositories;

public interface IIndicatorRepository
{
	Task<Indicator?> GetByCodeAsync(
		string code,
		CancellationToken cancellationToken = default);

	Task<IndicatorConfiguration?> GetConfigurationAsync(
		string indicatorCode,
		string parametersJson,
		CancellationToken cancellationToken = default);
}