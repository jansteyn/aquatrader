# AquaTraderUpload

Configure `ApiUrl`, `SourceFolder`, and `ArchiveFolder` in the `AquaTraderUpload` section of `appsettings.json`. The JSON file is loaded from beside the application; folder paths may be relative to the application's working directory.

Provide credentials through environment variables; they are not read from or stored in `appsettings.json`:

- `AQUATRADERUPLOAD_API_KEY`
- `AQUATRADERUPLOAD_API_SECRET`

Run the console app with `dotnet run --project AquaTraderUpload`.
