using Microsoft.Extensions.DependencyInjection;
using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Domain.Repositories;

namespace TechnicalAnalysis.Application.Services;

public sealed class TechnicalAnalysisService(
    IEodPriceRepository priceRepository,
    IIndicatorRepository indicatorRepository,
    IIndicatorEodRepository indicatorEodRepository,
    IIndicatorCalculationRunRepository runRepository,
    IKeyedServiceProvider keyedServiceProvider)
{
	private readonly IEodPriceRepository _priceRepository = priceRepository;
	private readonly IIndicatorRepository _indicatorRepository = indicatorRepository;
	private readonly IIndicatorEodRepository _indicatorEodRepository = indicatorEodRepository;
	private readonly IIndicatorCalculationRunRepository _runRepository = runRepository;
private readonly IKeyedServiceProvider _keyedServiceProvider = keyedServiceProvider;

    public async Task CalculateAsync(
		CalculateIndicatorRequest request,
		CancellationToken cancellationToken = default)
	{
        var indicator = await _indicatorRepository.GetByCodeAsync(
            request.IndicatorCode,
            cancellationToken) ?? throw new InvalidOperationException(
                $"Indicator with code '{request.IndicatorCode}' not found.");
				
        var prices = await _priceRepository.GetAsync(
			request.ListingId,
			request.FromDate,
			request.ToDate,
			cancellationToken);

		if (prices.Count == 0)
			return;

		var calculator = _keyedServiceProvider
			.GetRequiredKeyedService<IProviderIndicatorCalculator>(
			indicator.ProviderName);

		var result = await calculator.CalculateAsync(
			request.IndicatorCode,
			request.IndicatorConfigurationId,
			request.ParametersJson,
			prices,
			cancellationToken);

		await _indicatorEodRepository.BulkUpsertAsync(
			request.ListingId,
			result,
			cancellationToken);
	}
}