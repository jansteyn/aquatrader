namespace TechnicalAnalysis.Application;

public sealed record CalculateIndicatorRequest
{
	public required long ListingId { get; init; }

	public required long IndicatorConfigurationId { get; init; }

	public required string IndicatorCode { get; init; }

	public required string ParametersJson { get; init; }

	public required DateOnly FromDate { get; init; }

	public required DateOnly ToDate { get; init; }

	public int WarmupPeriods { get; init; } = 100;
}