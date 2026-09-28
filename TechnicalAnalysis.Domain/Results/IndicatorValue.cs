namespace TechnicalAnalysis.Domain.Results;

public sealed record IndicatorValue
{
	public required DateTime Date { get; init; }

	public double? Value1 { get; init; }

	public double? Value2 { get; init; }

	public double? Value3 { get; init; }

	public double? Value4 { get; init; }
}