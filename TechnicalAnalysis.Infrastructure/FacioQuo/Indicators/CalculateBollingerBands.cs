using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Indicators
{
	public class CalculateBollingerBands : IIndicatorCalculator
	{
		private const string code = "BOLLINGER_BANDS";
		public string Code => code;
		public IndicatorCalculationResult Calculate(
			IReadOnlyList<Bar> bars,
			long configurationId,
			string parametersJson)
		{

			var parameters =
				JsonSerializer.Deserialize<BollingerParameters>(parametersJson)
				?? throw new InvalidOperationException(
					"Invalid Bollinger parameters.");

			var results = bars.ToBollingerBands(
				parameters.Period,
				parameters.StandardDeviations);

			return new IndicatorCalculationResult
			{
				IndicatorConfigurationId = configurationId,

				Values = results
					.Select(x => new IndicatorValue
					{
						Date = x.Timestamp,
						Value1 = x.UpperBand,
						Value2 = x.Sma,
						Value3 = x.LowerBand
					})
					.ToList()
			};
		}
		private sealed record BollingerParameters(
		int Period,
		double StandardDeviations);
	}
}
