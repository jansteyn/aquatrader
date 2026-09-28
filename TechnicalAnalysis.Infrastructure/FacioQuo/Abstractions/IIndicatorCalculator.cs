using FacioQuo.Stock.Indicators;
using System;
using System.Collections.Generic;
using System.Text;
using TechnicalAnalysis.Domain.Results;

namespace TechnicalAnalysis.Infrastructure.FacioQuo.Abstractions
{
	public interface IIndicatorCalculator
	{

		public string Code { get; }

		IndicatorCalculationResult Calculate(
			IReadOnlyList<Bar> bars,
			long configurationId,
			string parametersJson);
	}
}
