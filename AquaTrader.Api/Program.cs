using AquaTrader.Api.Services;
using Npgsql;
using TechnicalAnalysis.Application;
using TechnicalAnalysis.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var technicalAnalysisConnectionString =
	builder.Configuration.GetConnectionString("TechnicalAnalysis");
var replicationOptions = builder.Configuration
	.GetSection(PriceEodReplicationOptions.SectionName)
	.Get<PriceEodReplicationOptions>() ?? new PriceEodReplicationOptions();

if (replicationOptions.Enabled &&
	string.IsNullOrWhiteSpace(technicalAnalysisConnectionString))
{
	throw new InvalidOperationException(
		"ConnectionStrings:TechnicalAnalysis must be configured when price replication is enabled.");
}

if (!string.IsNullOrWhiteSpace(technicalAnalysisConnectionString))
{
	builder.Services.AddSingleton(
		_ => NpgsqlDataSource.Create(technicalAnalysisConnectionString));
	builder.Services.AddTechnicalAnalysisApplication();
	builder.Services.AddTechnicalAnalysisInfrastructure();
}

if (replicationOptions.Enabled)
{
	builder.Services
		.AddOptions<PriceEodReplicationOptions>()
		.Bind(builder.Configuration.GetSection(
			PriceEodReplicationOptions.SectionName))
		.Validate(
			options =>
				!string.IsNullOrWhiteSpace(options.PublicationName) &&
				!string.IsNullOrWhiteSpace(options.SlotName),
			"PublicationName and SlotName must be configured.")
		.Validate(
			options => options.WarmupPeriods is > 0 and < int.MaxValue,
			"WarmupPeriods must be greater than zero and less than Int32.MaxValue.")
		.Validate(
			options => options.ReconnectDelaySeconds > 0,
			"ReconnectDelaySeconds must be greater than zero.")
		.ValidateOnStart();

	builder.Services.AddHostedService<PriceEodReplicationWorker>();
}

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseHttpsRedirection();

var summaries = new[]
{
	"Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
	var forecast = Enumerable.Range(1, 5).Select(index =>
		new WeatherForecast
		(
			DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
			Random.Shared.Next(-20, 55),
			summaries[Random.Shared.Next(summaries.Length)]
		))
		.ToArray();
	return forecast;
});

app.Run();

internal record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
	public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
