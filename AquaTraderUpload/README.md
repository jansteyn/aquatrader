# AquaTraderUpload

Configure `ApiUrl`, `SourceFolder`, and `ArchiveFolder` in the `AquaTraderUpload` section of `appsettings.json`. The JSON file is loaded from beside the application; folder paths may be relative to the application's working directory.

Provide credentials through environment variables; they are not read from or stored in `appsettings.json`:

- `AQUATRADERUPLOAD_API_KEY`
- `AQUATRADERUPLOAD_API_SECRET`

Run the console app with `dotnet run --project AquaTraderUpload`.

The app uploads top-level `.csv` files from `SourceFolder` one at a time to
`{ApiUrl}/api/staging/csvupload` as multipart form data using the `csv` field.
It sends `ApiKey` and `ApiSecret` as HTTP Basic credentials. Each file is moved
to `ArchiveFolder` only after the server returns a successful response. If an
upload fails, the app stops and leaves that file in `SourceFolder`.
