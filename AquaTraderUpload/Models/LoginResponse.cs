 namespace AquaTraderUpload.Models;
    internal sealed record LoginResponse(
        string AccessToken,
        string RefreshToken,
        string TokenType,
        int ExpiresIn,
        int RefreshExpiresIn);