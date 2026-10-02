using Microsoft.Extensions.DependencyInjection;
using TechnicalAnalysis.Application.Services;

namespace TechnicalAnalysis.Application;

public static class DependencyInjection
{
	public static IServiceCollection AddTechnicalAnalysisApplication(
		this IServiceCollection services)
	{
		services.AddScoped<TechnicalAnalysisService>();

		return services;
	}
}