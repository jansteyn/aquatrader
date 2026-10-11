using AquaTraderUpload;
using AquaTraderUpload.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Serilog;

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

var logFilePath = Path.GetFullPath(settings.LogFilePath, AppContext.BaseDirectory);
Directory.CreateDirectory(Path.GetDirectoryName(logFilePath)!);
builder.Logging.ClearProviders();
builder.Services.AddSerilog((_, loggerConfiguration) => loggerConfiguration
    .MinimumLevel.Information()
    .WriteTo.File(logFilePath, rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30));

builder.Services.AddSingleton(settings);
builder.Services.AddSingleton(new HttpClient());
builder.Services.AddSingleton<LoginService>();
builder.Services.AddSingleton<UploadService>();

using var host = builder.Build();
var logger = host.Services.GetRequiredService<ILogger<Program>>();

try
{
    settings.Validate();
    var uploadService = host.Services.GetRequiredService<UploadService>();
    await uploadService.ProcessFilesAsync();
}
catch (Exception exception)
{
    logger.LogCritical(exception, "The upload worker terminated due to an unhandled error.");
    Environment.ExitCode = 1;
}
