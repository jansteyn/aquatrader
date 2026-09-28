using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Domain.Series;

namespace TechnicalAnalysis.Application.Abstractions;

public interface IProviderIndicatorCalculator
{
	public string ProviderName { get; }
	Task<IndicatorCalculationResult> CalculateAsync(
		string indicatorCode,
		long indicatorConfigurationId,
		string parametersJson,
		IReadOnlyList<EodPrice> prices,
		CancellationToken cancellationToken = default);
}