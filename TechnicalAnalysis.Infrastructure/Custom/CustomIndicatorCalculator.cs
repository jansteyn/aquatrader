using System.Text.Json;
using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Domain.Series;

namespace TechnicalAnalysis.Infrastructure.Custom;

public class CustomIndicatorCalculator 
    : IProviderIndicatorCalculator
{
	private const string providerName = "custom";
	public static string ProviderName => providerName;

	public Task<IndicatorCalculationResult> CalculateAsync(
		string indicatorCode,
		long indicatorConfigurationId,
		string parametersJson,
		IReadOnlyList<EodPrice> prices,
		CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}
