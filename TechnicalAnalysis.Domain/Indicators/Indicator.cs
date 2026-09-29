namespace TechnicalAnalysis.Domain.Indicators;

public sealed class Indicator
{
	public Indicator()
	{
	}

	public short IndicatorId { get; private set; }

	public required string Code { get; init; }

	public required string Name { get; init; }

	public string? Description { get; init; }

	public required string ProviderName { get; init; }

	public required short OutputCount { get; init; }

	public bool IsActive { get; init; } = true;

	public IReadOnlyCollection<IndicatorOutput> Outputs { get; private set; }
		= [];
}