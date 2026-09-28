using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Indicators
{
	public class CalculateRsi : IIndicatorCalculator
	{
		private const string code = "RSI";
		public string Code => code;

		public IndicatorCalculationResult Calculate(
			IReadOnlyList<Bar> bars,
			long configurationId,
			string parametersJson)
		{
			var parameters =
				JsonSerializer.Deserialize<RsiParameters>(parametersJson)
				?? throw new InvalidOperationException(
					"Invalid RSI parameters.");

			var results = bars.ToRsi(parameters.Period);

			return new IndicatorCalculationResult
			{
				IndicatorConfigurationId = configurationId,

				Values = results
					.Select(x => new IndicatorValue
					{
						Date = x.Timestamp,
						Value1 = x.Rsi
					})
					.ToList()
			};
		}
		private sealed record RsiParameters(int Period);
	}
}
