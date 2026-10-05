 namespace AquaTraderUpload.Models;
    internal sealed record LoginRequest(
        string Scheme, 
        string ApiKey, 
        string Password);
