using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using TechnicalAnalysis.Domain.Results;
using TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Indicators
{
	public class CalculateSma : IIndicatorCalculator
	{
		private const string code = "SMA";
		public string Code => code;

		public IndicatorCalculationResult Calculate(IReadOnlyList<Bar> bars, long configurationId, string parametersJson)
		{
			var parameters =
				JsonSerializer.Deserialize<SmaParameters>(parametersJson)
				?? throw new InvalidOperationException("Invalid SMA parameters.");

			var results = bars.ToSma(parameters.Period);

			return new IndicatorCalculationResult
			{
				IndicatorConfigurationId = configurationId,

				Values = results
					.Select(x => new IndicatorValue
					{
						Date = x.Timestamp,
						Value1 = x.Sma
					})
					.ToList()
			};

		}
		private sealed record SmaParameters(int Period);

	}
}
