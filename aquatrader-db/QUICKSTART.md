# aquatrader Database - Quick Start Guide

## Prerequisites

- PostgreSQL 12+ running locally or accessible via network
- Java 11+ installed
- Liquibase CLI installed

## Installation

### 1. Install Liquibase CLI

**Windows (using Chocolatey):**
```powershell
choco install liquibase
```

**Windows (Manual):**
- Download from https://github.com/liquibase/liquibase/releases
- Add to PATH

**Linux/macOS:**
```bash
brew install liquibase
```

### 2. Verify Installation

```bash
liquibase --version
```

### 3. Install PostgreSQL JDBC Driver

The JDBC driver is typically included with Liquibase, but you can verify:

```bash
# On Windows (if using chocolatey)
# Usually in: C:\ProgramData\chocolatey\lib\liquibase\tools\lib\

# On Linux/macOS (if using brew)
# Usually in: /usr/local/opt/liquibase/lib/
```

## Quick Start - 5 Minutes

### Step 1: Update Configuration

Edit `liquibase.yaml` in the `aquatrader-db` directory:

```yaml
liquibase:
  url: jdbc:postgresql://localhost:5432/aquatrader
  username: postgres
  password: your_password
  changeLog: db/changelog/master.yaml
```

Or set environment variables:

**Windows (PowerShell):**
```powershell
$env:LIQUIBASE_COMMAND_CHANGE_LOG = "db/changelog/master.yaml"
$env:LIQUIBASE_DRIVER = "org.postgresql.Driver"
$env:LIQUIBASE_URL = "jdbc:postgresql://localhost:5432/aquatrader"
$env:LIQUIBASE_USERNAME = "postgres"
$env:LIQUIBASE_PASSWORD = "your_password"
```

**Linux/macOS (Bash):**
```bash
export LIQUIBASE_COMMAND_CHANGE_LOG=db/changelog/master.yaml
export LIQUIBASE_DRIVER=org.postgresql.Driver
export LIQUIBASE_URL=jdbc:postgresql://localhost:5432/aquatrader
export LIQUIBASE_USERNAME=postgres
export LIQUIBASE_PASSWORD=your_password
```

### Step 2: Create Target Database

If the database doesn't exist, create it:

**Windows (PowerShell):**
```powershell
psql -U postgres -c "CREATE DATABASE aquatrader;"
```

**Linux/macOS (Bash):**
```bash
psql -U postgres -c "CREATE DATABASE aquatrader;"
```

### Step 3: Run Migrations

Navigate to the `aquatrader-db` directory:

```bash
cd aquatrader-db
```

Apply all pending migrations:

```bash
liquibase update
```

You should see output like:
```
Waiting for changelog lock....
Starting Liquibase at [timestamp]
Liquibase command 'update' successful.
```

### Step 4: Verify

Check the applied migrations:

```bash
liquibase status
```

Or query the database:

**Windows (PowerShell):**
```powershell
psql -U postgres -d aquatrader -c "SELECT * FROM databasechangelog ORDER BY dateexecuted DESC LIMIT 10;"
```

**Linux/macOS (Bash):**
```bash
psql -U postgres -d aquatrader -c "SELECT * FROM databasechangelog ORDER BY dateexecuted DESC LIMIT 10;"
```

## Common Commands

### Apply Migrations
```bash
liquibase update
```

### View Status
```bash
liquibase status
```

### Rollback Last Change
```bash
liquibase rollback-by-count --count=1
```

### Generate Database Documentation
```bash
liquibase db-doc ./docs
```

### Dry Run (Preview Changes)
```bash
liquibase update-sql
```

### List Available Changesets
```bash
liquibase list-changesets
```

## Troubleshooting

### Database Connection Failed

**Error:** `Connect refused` or `No connection to host`

**Solutions:**
1. Verify PostgreSQL is running: `psql -U postgres`
2. Check host and port in liquibase.yaml
3. Verify firewall allows PostgreSQL connections
4. Ensure database exists: `psql -U postgres -l`

### Permission Denied

**Error:** `Role "postgres" is not permitted: permission denied for schema aquatrader`

**Solution:**
Create the schema first:
```sql
CREATE SCHEMA IF NOT EXISTS aquatrader;
```

### Changelog Lock Error

**Error:** `DATABASECHANGELOG table is locked`

**Solution:**
Release the lock:
```sql
SELECT * FROM databasechangeloglock;
UPDATE databasechangeloglock SET locked=false WHERE id=1;
```

### Invalid YAML Format

**Error:** `Error parsing YAML: ...`

**Solutions:**
1. Check YAML indentation (must be 2 spaces)
2. Verify no tabs are used
3. Validate YAML syntax at https://www.yamllint.com/

## Development Workflow

### For Database Developers

1. Make schema changes in PostgreSQL
2. Export the DDL to a new YAML file in the appropriate directory
3. Add an `- include:` directive in `master.yaml`
4. Test with `liquibase update`
5. Commit changes to version control

### For Application Developers

1. Pull latest code
2. Run `liquibase update` to sync database
3. Start development
4. Never modify existing changesets - create new ones instead

## Best Practices

1. **One change per changeset** - Makes rollback easier
2. **Descriptive IDs** - Use format: `NN-description`
3. **Test in dev first** - Always test migrations before production
4. **Keep it simple** - Avoid complex logic in migrations
5. **Document changes** - Add comments to complex SQL
6. **Version control** - Commit all YAML files
7. **Never delete changesets** - Only mark as rollback if needed

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Database Migrations

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'aquatrader-db/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: aquatrader
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      
      - name: Install Liquibase
        run: |
          curl -L -o liquibase-core.jar \
            https://github.com/liquibase/liquibase/releases/download/v4.25.0/liquibase-4.25.0.jar
      
      - name: Run Migrations
        run: |
          cd aquatrader-db
          liquibase update \
            --url=jdbc:postgresql://localhost:5432/aquatrader \
            --username=postgres \
            --password=postgres
```

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Review [CHANGESETS.md](./CHANGESETS.md) for changeset details
- Check [Liquibase official docs](https://docs.liquibase.com)

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review CHANGESETS.md for migration details
3. Consult Liquibase documentation
4. Contact the aquatrader development team
