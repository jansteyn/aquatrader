namespace TechnicalAnalysis.Domain.Results;

public sealed record IndicatorCalculationResult
{
	public required long IndicatorConfigurationId { get; init; }

	public required IReadOnlyList<IndicatorValue> Values { get; init; }
}