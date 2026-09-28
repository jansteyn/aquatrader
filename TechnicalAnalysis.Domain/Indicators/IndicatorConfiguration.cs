namespace TechnicalAnalysis.Domain.Indicators;

public sealed class IndicatorConfiguration
{
	private IndicatorConfiguration()
	{
	}

	public long IndicatorConfigurationId { get; private set; }

	public short IndicatorId { get; private set; }

	public required string ParametersJson { get; init; }

	public required byte[] ParametersHash { get; init; }
}