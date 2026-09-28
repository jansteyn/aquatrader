namespace TechnicalAnalysis.Domain.Indicators;

public sealed class IndicatorOutput
{
	private IndicatorOutput()
	{
	}

	public short IndicatorOutputId { get; private set; }

	public short IndicatorId { get; private set; }

	public required short OutputIndex { get; init; }

	public required string Code { get; init; }

	public required string Name { get; init; }
}