using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Domain.Series;

namespace TechnicalAnalysis.Application.Abstractions;

public interface IProviderIndicatorCalculator
{
	private const string providerName = "interface";
	public static string ProviderName => providerName;
	Task<IndicatorCalculationResult> CalculateAsync(
		string indicatorCode,
		long indicatorConfigurationId,
		string parametersJson,
		IReadOnlyList<EodPrice> prices,
		CancellationToken cancellationToken = default);
}