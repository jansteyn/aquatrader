using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using AquaTraderUpload.Models;

namespace AquaTraderUpload.Services;

public sealed class UploadService(
    AquaTraderUploadSettings settings,
    HttpClient httpClient,
    ILogger<UploadService> logger,
    LoginService loginService)
{
    private static readonly Uri LoginPath = new("api/core/api-login", UriKind.Relative);
    private static readonly Uri UploadPath = new("api/staging/csv-upload?meta=%7B%7D", UriKind.Relative);

    public async Task ProcessFilesAsync(CancellationToken cancellationToken = default)
    {
        var sourceFolder = Path.GetFullPath(settings.SourceFolder);
        var archiveFolder = Path.GetFullPath(settings.ArchiveFolder);
        var apiBaseUri = new Uri($"{settings.ApiUrl.TrimEnd('/')}/");
        var loginUri = new Uri(apiBaseUri, LoginPath);
        var uploadUri = new Uri(apiBaseUri, UploadPath);
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
        var jwt = await loginService.LoginAsync(loginUri, cancellationToken);

        foreach (var filePath in files)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);
            using var request = new HttpRequestMessage(HttpMethod.Post, uploadUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

            var fileStream = File.OpenRead(filePath);
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
            var multipartContent = new MultipartFormDataContent();
            multipartContent.Add(fileContent, "csv", fileName);
            request.Content = multipartContent;

            logger.LogInformation("Uploading {FileName} to {UploadUri}.", fileName, uploadUri);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();
            fileStream.Close();
            var archivedPath = Path.Combine(archiveFolder, fileName);
            File.Move(filePath, archivedPath);
            logger.LogInformation("Uploaded and archived {FileName}.", fileName);
        }
    }

}
