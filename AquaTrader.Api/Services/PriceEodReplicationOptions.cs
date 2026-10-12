namespace AquaTrader.Api.Services;

public sealed class PriceEodReplicationOptions
{
	public const string SectionName = "TechnicalAnalysis:Replication";

	public bool Enabled { get; set; }

	public string PublicationName { get; set; } = "aquatrader_technical_analysis";

	public string SlotName { get; set; } = "aquatrader_technical_analysis";

	public int WarmupPeriods { get; set; } = 100;

	public int ReconnectDelaySeconds { get; set; } = 5;
}
