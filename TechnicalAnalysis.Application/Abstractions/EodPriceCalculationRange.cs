namespace TechnicalAnalysis.Application.Abstractions;

public sealed record EodPriceCalculationRange(
	DateOnly FromDate,
	DateOnly ToDate);
