using Microsoft.Extensions.DependencyInjection;
using TechnicalAnalysis.Application.Abstractions;
using TechnicalAnalysis.Domain.Repositories;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;
using TechnicalAnalysis.Infrastructure.FacioQuo;
using TechnicalAnalysis.Infrastructure.PostgreSql;

namespace TechnicalAnalysis.Infrastructure;

public static class DependencyInjection
{
	public static IServiceCollection AddTechnicalAnalysisInfrastructure(
		this IServiceCollection services)
	{
		services.AddScoped<IEodPriceRepository, EodPriceRepository>();

		services.AddScoped<
			IIndicatorRepository,
			IndicatorRepository>();

		services.AddScoped<
			IIndicatorEodRepository,
			IndicatorEodRepository>();

		services.AddScoped<
			IIndicatorCalculationRunRepository,
			IndicatorCalculationRunRepository>();

		services.AddScoped<
			IProviderIndicatorCalculator,
			FacioQuoIndicatorCalculator>();

		var calculatorTypes = typeof(DependencyInjection).Assembly
			.GetTypes()
			.Where(type =>
				type is { IsAbstract: false, IsInterface: false } &&
				type.IsAssignableTo(typeof(IIndicatorCalculator)));

		foreach (var calculatorType in calculatorTypes)
		{
			var calculator = (IIndicatorCalculator)Activator.CreateInstance(calculatorType)!;

			services.AddKeyedScoped(
				typeof(IIndicatorCalculator),
				calculator.Code,
				calculatorType);
		}

		return services;
	}
}