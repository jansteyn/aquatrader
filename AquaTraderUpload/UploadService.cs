using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Logging;

namespace AquaTraderUpload;

public sealed class UploadService(
    AquaTraderUploadSettings settings,
    HttpClient httpClient,
    ILogger<UploadService> logger)
{
    private static readonly Uri UploadPath = new("api/staging/csvupload", UriKind.Relative);

    public async Task ProcessFilesAsync(CancellationToken cancellationToken = default)
    {
        var sourceFolder = Path.GetFullPath(settings.SourceFolder);
        var archiveFolder = Path.GetFullPath(settings.ArchiveFolder);
        var uploadUri = new Uri(new Uri($"{settings.ApiUrl.TrimEnd('/')}/"), UploadPath);
        var files = Directory
            .EnumerateFiles(sourceFolder, "*.csv", SearchOption.TopDirectoryOnly)
            .OrderBy(Path.GetFileName, StringComparer.Ordinal)
            .ToArray();

        if (files.Length == 0)
        {
            logger.LogInformation("No CSV files found in {SourceFolder}.", sourceFolder);
            return;
        }

        Directory.CreateDirectory(archiveFolder);

        foreach (var filePath in files)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);
            using var request = new HttpRequestMessage(HttpMethod.Post, uploadUri);
            var credentials = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{settings.ApiKey}:{settings.ApiSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            var fileStream = File.OpenRead(filePath);
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
            var multipartContent = new MultipartFormDataContent();
            multipartContent.Add(fileContent, "csv", fileName);
            request.Content = multipartContent;

            logger.LogInformation("Uploading {FileName} to {UploadUri}.", fileName, uploadUri);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var archivedPath = Path.Combine(archiveFolder, fileName);
            File.Move(filePath, archivedPath);
            logger.LogInformation("Uploaded and archived {FileName}.", fileName);
        }
    }
}
