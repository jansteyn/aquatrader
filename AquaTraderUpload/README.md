# AquaTraderUpload

Configure `ApiUrl`, `SourceFolder`, `ArchiveFolder`, `ExceptionFolder`, and `LogFilePath` in the `AquaTraderUpload` section of `appsettings.json`. The JSON file is loaded from beside the application; folder paths may be relative to the application's working directory. Relative log paths are resolved from the application directory. Logs roll daily and retain the 30 most recent files.

Provide credentials through environment variables; they are not read from or stored in `appsettings.json`:

- `AQUATRADERUPLOAD_API_KEY`
- `AQUATRADERUPLOAD_API_SECRET`

Run the console app with `dotnet run --project AquaTraderUpload`.

The app uploads top-level `.csv` files from `SourceFolder` one at a time to
`{ApiUrl}/api/staging/dn-upload` as multipart form data using the `csv` field.
Before uploading, it posts `scheme`, `apiKey`, and `password` to
`{ApiUrl}/api/api_login`, using `Bearer`, `ApiKey`, and `ApiSecret` respectively.
The returned JWT is sent in the Authorization header with each upload. Each file
is moved to `ArchiveFolder` only after the server returns a successful response.
If processing a file fails, the app logs the exception, moves that file to
`ExceptionFolder` (adding a unique suffix if the name already exists there),
and exits with a non-zero status. Files not yet processed remain in `SourceFolder`.
