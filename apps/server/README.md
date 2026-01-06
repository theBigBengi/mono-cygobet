# API

## Jobs scheduler (cron)

This API process can run DB-backed cron jobs via `node-cron` (see `src/plugins/jobs-scheduler.ts`).

- **JOBS_SCHEDULER_ENABLED**: set to disable the scheduler on a given instance.
  - Default: enabled
  - Disable values: `0`, `false`, `no`, `off`
  - Example: `JOBS_SCHEDULER_ENABLED=false pnpm --filter server dev`

## Seeding

The seeding system supports seeding various entities from the SportMonks API. Use CLI flags to specify what to seed.

> 📖 **For detailed CLI documentation, see [src/etl/seeds/README.md](./src/etl/seeds/README.md)**

### Basic Usage

```bash
# Seed everything (runs in dependency order)
pnpm --filter server seed

# Dry run (no database changes)
pnpm --filter server seed:dry

# Seed specific entities
pnpm --filter server seed -- --countries
pnpm --filter server seed -- --leagues
pnpm --filter server seed -- --teams
pnpm --filter server seed -- --seasons
pnpm --filter server seed -- --fixtures
pnpm --filter server seed -- --odds
pnpm --filter server seed -- --jobs
pnpm --filter server seed -- --bookmakers

# Combine multiple flags
pnpm --filter server seed -- --countries --leagues --teams

# Dry run with specific entities
pnpm --filter server seed:dry -- --countries --leagues
```

### Advanced Options

#### Fixtures

```bash
# Seed fixtures for a specific season
pnpm --filter server seed -- --fixtures --fixtures-season=12345

# Seed fixtures for all seasons (default)
pnpm --filter server seed -- --fixtures
```

#### Odds

```bash
# Seed odds with custom date range
pnpm --filter server seed -- --odds --odds-from=2025-01-01 --odds-to=2025-01-31

# Custom filters (default: bookmakers:1;markets:1,57;fixtureStates:1)
pnpm --filter server seed -- --odds --odds-filters="bookmakers:1,2;markets:1,57"
```

### Seeding Order

The system automatically seeds in dependency order:

1. **bookmakers** - No dependencies
2. **countries** - No dependencies
3. **leagues** - Depends on: countries
4. **teams** - Depends on: countries
5. **seasons** - Depends on: leagues
6. **fixtures** - Depends on: leagues, seasons, teams
7. **odds** - Depends on: fixtures
8. **jobs** - No dependencies

When using `--all` or no flags, seeds run in the correct order automatically. When running individual seeds, ensure dependencies are seeded first.

### Examples

```bash
# Full seed (production)
pnpm --filter server seed

# Test run before seeding
pnpm --filter server seed:dry

# Seed only countries and leagues
pnpm --filter server seed -- --countries --leagues

# Seed fixtures for a specific season with dry run
pnpm --filter server seed:dry -- --fixtures --fixtures-season=12345

# Seed odds for next week
pnpm --filter server seed -- --odds --odds-from=2025-01-01 --odds-to=2025-01-07
```
