namespace AquaTraderUpload;

public sealed class AquaTraderUploadSettings
{
    public const string SectionName = "AquaTraderUpload";

    public string ApiKey { get; set; } = string.Empty;

    public string ApiSecret { get; set; } = string.Empty;

    public string ApiUrl { get; set; } = string.Empty;

    public string SourceFolder { get; set; } = string.Empty;

    public string ArchiveFolder { get; set; } = string.Empty;

    public string ExceptionFolder { get; set; } = "exceptions";

    public string LogFilePath { get; set; } = Path.Combine("logs", "aquatrader-upload-.log");

    public void Validate()
    {
        var missingSettings = new List<string>();

        if (string.IsNullOrWhiteSpace(ApiKey))
        {
            missingSettings.Add("environment variable AQUATRADERUPLOAD_API_KEY");
        }

        if (string.IsNullOrWhiteSpace(ApiSecret))
        {
            missingSettings.Add("environment variable AQUATRADERUPLOAD_API_SECRET");
        }

        if (string.IsNullOrWhiteSpace(ApiUrl))
        {
            missingSettings.Add($"{SectionName}:ApiUrl in appsettings.json");
        }
        else if (!Uri.TryCreate(ApiUrl, UriKind.Absolute, out var apiUri)
            || (apiUri.Scheme != Uri.UriSchemeHttp && apiUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException($"{SectionName}:ApiUrl must be an absolute HTTP or HTTPS URL.");
        }

        if (string.IsNullOrWhiteSpace(SourceFolder))
        {
            missingSettings.Add($"{SectionName}:SourceFolder in appsettings.json");
        }

        if (string.IsNullOrWhiteSpace(ArchiveFolder))
        {
            missingSettings.Add($"{SectionName}:ArchiveFolder in appsettings.json");
        }

        if (string.IsNullOrWhiteSpace(ExceptionFolder))
        {
            missingSettings.Add($"{SectionName}:ExceptionFolder in appsettings.json");
        }

        if (string.IsNullOrWhiteSpace(LogFilePath))
        {
            missingSettings.Add($"{SectionName}:LogFilePath in appsettings.json");
        }

        if (missingSettings.Count > 0)
        {
            throw new InvalidOperationException($"Missing required settings: {string.Join(", ", missingSettings)}.");
        }

        var pathComparer = OperatingSystem.IsWindows()
            ? StringComparer.OrdinalIgnoreCase
            : StringComparer.Ordinal;
        var sourcePath = Path.GetFullPath(SourceFolder);
        var archivePath = Path.GetFullPath(ArchiveFolder);
        var exceptionPath = Path.GetFullPath(ExceptionFolder);

        if (pathComparer.Equals(sourcePath, archivePath)
            || pathComparer.Equals(sourcePath, exceptionPath)
            || pathComparer.Equals(archivePath, exceptionPath))
        {
            throw new InvalidOperationException("SourceFolder, ArchiveFolder, and ExceptionFolder must be different directories.");
        }
    }
}
