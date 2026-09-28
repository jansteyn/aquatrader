using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Indicators
{
	public class CalculateAtr : IIndicatorCalculator
	{
		private const string code = "ATR";
		public string Code => code;
		public IndicatorCalculationResult Calculate(
			IReadOnlyList<Bar> bars,
			long configurationId,
			string parametersJson)
		{
			var parameters =
				JsonSerializer.Deserialize<AtrParameters>(parametersJson)
				?? throw new InvalidOperationException(
					"Invalid ATR parameters.");

			var results = bars.ToAtr(parameters.Period);

			return new IndicatorCalculationResult
			{
				IndicatorConfigurationId = configurationId,

				Values = results
					.Select(x => new IndicatorValue
					{
						Date = x.Timestamp,
						Value1 = x.Atr
					})
					.ToList()
			};
		}
		private sealed record AtrParameters(int Period);
	}

}
