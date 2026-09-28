using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Indicators
{
	public class CalculateEma : IIndicatorCalculator
	{
		private const string code = "EMA";
		public string Code => code;
		public IndicatorCalculationResult Calculate(
			IReadOnlyList<Bar> bars,
			long configurationId,
			string parametersJson)
		{
			var parameters =
				JsonSerializer.Deserialize<EmaParameters>(parametersJson)
				?? throw new InvalidOperationException(
					"Invalid EMA parameters.");

			var results = bars.ToEma(parameters.Period);

			return new IndicatorCalculationResult
			{
				IndicatorConfigurationId = configurationId,

				Values = results
					.Select(x => new IndicatorValue
					{
						Date = x.Timestamp,
						Value1 = x.Ema
					})
					.ToList()
			};
		}
		private sealed record EmaParameters(int Period);
	}
}
