using System;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using AquaTraderUpload.Models;
using System.Net.Http.Headers;

namespace AquaTraderUpload.Services;

public class LoginService(AquaTraderUploadSettings settings,
    HttpClient httpClient,
    ILogger<LoginService> logger)
{
    public async Task<string> LoginAsync(Uri loginUri, CancellationToken cancellationToken)
    {
        logger.LogInformation("Requesting an upload token from {LoginUri}.{ApiKey}{ApiSecret}", loginUri, settings.ApiKey, settings.ApiSecret);
        using var response = await httpClient.PostAsJsonAsync(
            loginUri,
            new LoginRequest("Bearer", settings.ApiKey, settings.ApiSecret),
            cancellationToken);
        response.EnsureSuccessStatusCode();

        var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>(cancellationToken: cancellationToken);
        if (loginResponse is not null && !string.IsNullOrWhiteSpace(loginResponse.AccessToken))
        {
            return loginResponse.AccessToken;
        }

        if (response.Headers.TryGetValues("Authorization", out var authorizationValues))
        {
            var authorization = AuthenticationHeaderValue.Parse(authorizationValues.Single());
            if (string.Equals(authorization.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(authorization.Parameter))
            {
                return authorization.Parameter;
            }
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var token = FindToken(document.RootElement);
            if (!string.IsNullOrWhiteSpace(token))
            {
                return token;
            }
        }
        catch (JsonException)
        {
            var rawToken = responseBody.Trim().Trim('"');
            if (!string.IsNullOrWhiteSpace(rawToken))
            {
                return rawToken;
            }
        }

        throw new InvalidOperationException("The login response did not contain a JWT.");
    }

    private static string? FindToken(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.String)
        {
            return element.GetString();
        }

        if (element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var propertyName in new[] { "jwt", "token", "accessToken", "access_token" })
        {
            if (element.TryGetProperty(propertyName, out var property)
                && property.ValueKind == JsonValueKind.String)
            {
                return property.GetString();
            }
        }

        return null;
    }

}
