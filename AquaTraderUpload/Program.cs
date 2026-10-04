using AquaTraderUpload;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});
var settings = builder.Configuration
    .GetSection(AquaTraderUploadSettings.SectionName)
    .Get<AquaTraderUploadSettings>() ?? new AquaTraderUploadSettings();

settings.ApiKey = Environment.GetEnvironmentVariable("AQUATRADERUPLOAD_API_KEY") ?? string.Empty;
settings.ApiSecret = Environment.GetEnvironmentVariable("AQUATRADERUPLOAD_API_SECRET") ?? string.Empty;
settings.Validate();

Console.WriteLine($"AquaTraderUpload settings loaded for {settings.ApiUrl}.");
