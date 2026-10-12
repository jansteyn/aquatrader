# Technical analysis price replication

The API can consume committed `prices.price_eod` inserts and updates through PostgreSQL logical replication. The Liquibase changelog creates the `aquatrader_technical_analysis` publication with only `listing_id` and `price_date` in its row stream. The worker creates its persistent `pgoutput` slot on first start and resumes from that slot after reconnects.

Configure the API with:

- `ConnectionStrings__TechnicalAnalysis`: the PostgreSQL connection string used by the technical-analysis repositories and replication connection.
- `TechnicalAnalysis__Replication__Enabled=true`: enables the hosted worker.
- `TechnicalAnalysis__Replication__PublicationName`: the existing publication name (defaults to `aquatrader_technical_analysis`).
- `TechnicalAnalysis__Replication__SlotName`: the persistent replication slot name (defaults to `aquatrader_technical_analysis`).
- `TechnicalAnalysis__Replication__WarmupPeriods`: the number of preceding EOD rows to load as warmup (defaults to `100`).
- `TechnicalAnalysis__Replication__ReconnectDelaySeconds`: retry delay after a replication failure (defaults to `5`).

The database must have `wal_level=logical`; the configured user needs the PostgreSQL `REPLICATION` attribute and normal read/write access required by the technical-analysis repositories. Apply the Liquibase changelog before enabling the worker. The column-list publication requires PostgreSQL 15 or newer. A custom publication must publish `prices.price_eod` and include both `listing_id` and `price_date`.

For each committed insert or update, the worker loads all active indicator configurations, determines a calculation range from the configured warmup rows through the listing's latest price date, and invokes `TechnicalAnalysisService.CalculateAsync` for each configuration.
