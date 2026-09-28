# aquatrader Database - Liquibase Migrations

This directory contains database migration files managed by Liquibase. All migrations are defined in YAML format with SQL text blocks.

## Project Structure

```
aquatrader-db/
├── db/
│   └── changelog/
│       ├── master.yaml              # Main changelog that includes all migrations
│       ├── 01-tables/               # Table creation migrations
│       │   ├── 01-organisations.yaml
│       │   ├── 02-users.yaml
│       │   ├── 03-subscription-plans.yaml
│       │   ├── 04-entitlements.yaml
│       │   ├── 05-subscriptions.yaml
│       │   ├── 06-subscription-entitlements.yaml
│       │   ├── 07-invoices.yaml
│       │   ├── 08-entitlement-usage.yaml
│       │   ├── 09-payment-providers.yaml
│       │   ├── 10-payments.yaml
│       │   └── 11-plan-entitlements.yaml
│       └── 02-functions/            # Stored procedures/functions
│           └── 01-functions.yaml
├── liquibase.yaml                   # Liquibase configuration
└── README.md                         # This file
```

## Installation & Setup

### Prerequisites

- Java 11 or higher
- PostgreSQL 12+
- Liquibase CLI or Maven/Gradle plugin

### Install Liquibase CLI

**Windows (using Chocolatey):**
```powershell
choco install liquibase
```

**macOS (using Homebrew):**
```bash
brew install liquibase
```

**Manual Installation:**
Download from https://www.liquibase.org/get-started/download

### Configuration

Update `liquibase.yaml` with your database credentials:

```yaml
liquibase:
  driver: org.postgresql.Driver
  url: jdbc:postgresql://localhost:5432/aquatrader
  username: postgres
  password: your_password
  changeLog: db/changelog/master.yaml
```

Or use environment variables:
```bash
export LIQUIBASE_COMMAND_CHANGE_LOG=db/changelog/master.yaml
export LIQUIBASE_DRIVER=org.postgresql.Driver
export LIQUIBASE_URL=jdbc:postgresql://localhost:5432/aquatrader
export LIQUIBASE_USERNAME=postgres
export LIQUIBASE_PASSWORD=your_password
```

## Usage

### Run Migrations

Apply all pending changesets:
```bash
liquibase update
```

### Check Deployment Status

See which migrations have been applied:
```bash
liquibase status
```

### Rollback

Rollback the last change:
```bash
liquibase rollback-by-count --count=1
```

Rollback to a specific date:
```bash
liquibase rollback-by-date --date=2024-01-15
```

### Generate Documentation

Create a changelog report:
```bash
liquibase db-doc ./docs
```

### Validate Changesets

Check for errors before applying:
```bash
liquibase validate
```

## Migration Format

All migrations use YAML format with embedded SQL:

```yaml
databaseChangeLog:
  - changeSet:
      id: unique-id
      author: migration-author
      changes:
        - sql:
            sql: |
              CREATE TABLE schema.table_name (
                id INT PRIMARY KEY,
                name VARCHAR(100)
              );
            splitStatements: false
```

### Key Parameters:
- `id`: Unique identifier for the changeset (must be unique within the file)
- `author`: Name of the migration author
- `sql`: The SQL statement to execute
- `splitStatements: false`: Prevents Liquibase from splitting on semicolons (important for functions)

## Adding New Migrations

1. Create a new YAML file in the appropriate directory (01-tables/ or 02-functions/)
2. Follow the naming convention: `NN-description.yaml`
3. Include the changeset in `master.yaml` with an `- include:` directive
4. Ensure the changeset ID is unique

Example:
```yaml
- include:
    file: 01-tables/12-new-table.yaml
```

## Database Objects Managed

### Tables
- organisations
- users
- subscription_plans
- entitlements
- subscriptions
- subscription_entitlements
- invoices
- entitlement_usage
- payment_providers
- payments
- plan_entitlements

### Stored Functions
- Entitlements: insert, update, delete, get
- Entitlement Usage: insert, update, delete, get
- Invoices: insert, update, delete, get
- Payments: insert, update, delete, get
- Payment Providers: insert, get, delete
- Plan Entitlements: insert, get, delete
- Subscriptions: insert, update, delete, get
- Subscription Plans: insert, get, delete
- Subscription Entitlements: insert, update, delete, get

## Best Practices

1. **One change per changeset**: Keep changesets focused on a single logical change
2. **Use meaningful IDs**: Make changeset IDs descriptive and version-based
3. **Include comments**: Add SQL comments explaining complex changes
4. **Test migrations**: Always test migrations on a development database first
5. **Preserve history**: Never modify or delete existing changesets; use rollback if needed
6. **Use transactions**: Most DDL operations are automatically transactional in PostgreSQL

## Troubleshooting

### Migration Failed
Check the DATABASECHANGELOG table:
```sql
SELECT * FROM databasechangelog 
WHERE dateexecuted IS NULL OR EXECTYPE = 'FAILED' 
ORDER BY dateexecuted DESC;
```

### Connection Issues
Verify PostgreSQL JDBC driver is installed:
```bash
liquibase --version
```

### Duplicate Changeset IDs
Ensure each changeset has a unique ID within its YAML file.

## References

- [Liquibase Documentation](https://docs.liquibase.com/)
- [PostgreSQL Liquibase Support](https://docs.liquibase.com/workflows/database-setup-tutorials/postgresql)
- [Liquibase YAML Format](https://docs.liquibase.com/change-types/sql.html)

## Contact

For issues or questions about these migrations, contact the aquatrader development team.
