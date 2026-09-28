using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Domain.Repositories;

namespace TechnicalAnalysis.Application.Services;

public sealed class TechnicalAnalysisService
{
	private readonly IEodPriceRepository _priceRepository;
	private readonly IProviderIndicatorCalculator _calculator;
	private readonly IIndicatorRepository _indicatorRepository;
	private readonly IIndicatorEodRepository _indicatorEodRepository;
	private readonly IIndicatorCalculationRunRepository _runRepository;

	public TechnicalAnalysisService(
		IEodPriceRepository priceRepository,
		IProviderIndicatorCalculator calculator,
		IIndicatorRepository indicatorRepository,
		IIndicatorEodRepository indicatorEodRepository,
		IIndicatorCalculationRunRepository runRepository)
	{
		_priceRepository = priceRepository;
		_calculator = calculator;
		_indicatorRepository = indicatorRepository;
		_indicatorEodRepository = indicatorEodRepository;
		_runRepository = runRepository;
	}

	public async Task CalculateAsync(
		CalculateIndicatorRequest request,
		CancellationToken cancellationToken = default)
	{
		var prices = await _priceRepository.GetAsync(
			request.ListingId,
			request.FromDate,
			request.ToDate,
			cancellationToken);

		if (prices.Count == 0)
			return;

		var result = await _calculator.CalculateAsync(
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