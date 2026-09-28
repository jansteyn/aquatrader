namespace TechnicalAnalysis.Domain.Series;

public sealed record EodPrice
{
	public required DateTime Date { get; init; }

	public required decimal Open { get; init; }

	public required decimal High { get; init; }

	public required decimal Low { get; init; }

	public required decimal Close { get; init; }

	public required decimal Volume { get; init; }
}