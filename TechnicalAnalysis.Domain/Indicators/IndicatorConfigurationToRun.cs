namespace TechnicalAnalysis.Domain.Indicators;

public sealed record IndicatorConfigurationToRun
{
	public required long IndicatorConfigurationId { get; init; }

	public required string IndicatorCode { get; init; }

	public required string ParametersJson { get; init; }
}
