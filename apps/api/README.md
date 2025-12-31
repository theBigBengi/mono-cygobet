# API

## Seeding

The seeding system supports seeding various entities from the SportMonks API. Use CLI flags to specify what to seed.

> 📖 **For detailed CLI documentation, see [src/etl/seeds/README.md](./src/etl/seeds/README.md)**

### Basic Usage

```bash
# Seed everything (runs in dependency order)
pnpm --filter api seed

# Dry run (no database changes)
pnpm --filter api seed:dry

# Seed specific entities
pnpm --filter api seed -- --countries
pnpm --filter api seed -- --leagues
pnpm --filter api seed -- --teams
pnpm --filter api seed -- --seasons
pnpm --filter api seed -- --fixtures
pnpm --filter api seed -- --odds
pnpm --filter api seed -- --jobs
pnpm --filter api seed -- --bookmakers

# Combine multiple flags
pnpm --filter api seed -- --countries --leagues --teams

# Dry run with specific entities
pnpm --filter api seed:dry -- --countries --leagues
```

### Advanced Options

#### Fixtures

```bash
# Seed fixtures for a specific season
pnpm --filter api seed -- --fixtures --fixtures-season=12345

# Seed fixtures for all seasons (default)
pnpm --filter api seed -- --fixtures
```

#### Odds

```bash
# Seed odds with custom date range
pnpm --filter api seed -- --odds --odds-from=2025-01-01 --odds-to=2025-01-31

# Custom filters (default: bookmakers:1;markets:1,57;fixtureStates:1)
pnpm --filter api seed -- --odds --odds-filters="bookmakers:1,2;markets:1,57"
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
pnpm --filter api seed

# Test run before seeding
pnpm --filter api seed:dry

# Seed only countries and leagues
pnpm --filter api seed -- --countries --leagues

# Seed fixtures for a specific season with dry run
pnpm --filter api seed:dry -- --fixtures --fixtures-season=12345

# Seed odds for next week
pnpm --filter api seed -- --odds --odds-from=2025-01-01 --odds-to=2025-01-07
```
