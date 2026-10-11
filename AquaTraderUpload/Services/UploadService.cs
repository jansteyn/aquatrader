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
    private static readonly Uri UploadPath = new("api/staging/dn-upload?meta=%7B%7D", UriKind.Relative);

    public async Task ProcessFilesAsync(CancellationToken cancellationToken = default)
    {
        var sourceFolder = Path.GetFullPath(settings.SourceFolder);
        var archiveFolder = Path.GetFullPath(settings.ArchiveFolder);
        var exceptionFolder = Path.GetFullPath(settings.ExceptionFolder);
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
        Directory.CreateDirectory(exceptionFolder);
        var jwt = await loginService.LoginAsync(loginUri, cancellationToken);

        foreach (var filePath in files)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, uploadUri);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jwt);

                using var fileStream = File.OpenRead(filePath);
                using var fileContent = new StreamContent(fileStream);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
                using var multipartContent = new MultipartFormDataContent();
                multipartContent.Add(fileContent, "csv", fileName);
                request.Content = multipartContent;

                logger.LogInformation("Uploading {FileName} to {UploadUri}.", fileName, uploadUri);
                using var response = await httpClient.SendAsync(request, cancellationToken);
                response.EnsureSuccessStatusCode();

                var archivedPath = Path.Combine(archiveFolder, fileName);
                File.Move(filePath, archivedPath);
                logger.LogInformation("Uploaded and archived {FileName}.", fileName);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Failed to process {FileName}; moving it to {ExceptionFolder}.", fileName, exceptionFolder);

                try
                {
                    Directory.CreateDirectory(exceptionFolder);
                    var exceptionPath = GetExceptionFilePath(exceptionFolder, fileName);
                    File.Move(filePath, exceptionPath);
                    logger.LogWarning("Moved failed upload {FileName} to {ExceptionPath}.", fileName, exceptionPath);
                }
                catch (Exception moveException)
                {
                    logger.LogError(moveException, "Could not move failed upload {FileName} to {ExceptionFolder}; it may remain in the source folder.", fileName, exceptionFolder);
                }

                throw;
            }
        }
    }

    private static string GetExceptionFilePath(string exceptionFolder, string fileName)
    {
        var destination = Path.Combine(exceptionFolder, fileName);
        if (!File.Exists(destination))
        {
            return destination;
        }

        var uniqueName = $"{Path.GetFileNameWithoutExtension(fileName)}.{DateTime.UtcNow:yyyyMMddHHmmssfff}.{Guid.NewGuid():N}{Path.GetExtension(fileName)}";
        return Path.Combine(exceptionFolder, uniqueName);
    }
}
