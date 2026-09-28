using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Indicators
{
	public class CalculateMacd : IIndicatorCalculator
	{
		private const string code = "MACD";
		public string Code => code;
		public IndicatorCalculationResult Calculate(
			IReadOnlyList<Bar> bars,
			long configurationId,
			string parametersJson)
		{
			var parameters =
				JsonSerializer.Deserialize<MacdParameters>(parametersJson)
				?? throw new InvalidOperationException(
					"Invalid MACD parameters.");

			var results = bars.ToMacd(
				parameters.FastPeriod,
				parameters.SlowPeriod,
				parameters.SignalPeriod);

			return new IndicatorCalculationResult
			{
				IndicatorConfigurationId = configurationId,

				Values = results
					.Select(x => new IndicatorValue
					{
						Date = x.Timestamp,
						Value1 = x.Macd,
						Value2 = x.Signal,
						Value3 = x.Histogram
					})
					.ToList()
			};
		}
		private sealed record MacdParameters(int FastPeriod, int SlowPeriod, int SignalPeriod);
	}
}
