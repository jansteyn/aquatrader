using FacioQuo.Stock.Indicators;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Domain.Series;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo;

public sealed class FacioQuoIndicatorCalculator
	: IProviderIndicatorCalculator
{
	private readonly IKeyedServiceProvider _keyedServiceProvider;

	public FacioQuoIndicatorCalculator(IKeyedServiceProvider keyedServiceProvider)
	{
		_keyedServiceProvider = keyedServiceProvider;
	}

	private const string providerName = "FacioQuo";
	public string ProviderName => providerName;

	public Task<IndicatorCalculationResult> CalculateAsync(
		string indicatorCode,
		long indicatorConfigurationId,
		string parametersJson,
		IReadOnlyList<EodPrice> prices,
		CancellationToken cancellationToken = default)
	{
		var bars = prices
			.Select(x => new Bar(
				x.Date,
				x.Open,
				x.High,
				x.Low,
				x.Close,
				x.Volume))
			.ToList();

		var calculator = _keyedServiceProvider
			.GetRequiredKeyedService<IIndicatorCalculator>(indicatorCode);
		var result = calculator.Calculate(
			bars,
			indicatorConfigurationId,
			parametersJson);

		return Task.FromResult(result);
	}


}
