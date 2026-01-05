# Seeding CLI

Command-line tool for seeding the database with data from the SportMonks API.

## Quick Start

```bash
# Seed everything (runs in dependency order)
pnpm --filter server seed

# Dry run (no database changes)
pnpm --filter server seed:dry
```

## Usage

### Basic Commands

```bash
# Using npm scripts (recommended)
pnpm --filter server seed [flags...]
pnpm --filter server seed:dry [flags...]

# Direct execution
tsx src/etl/seeds/seed.cli.ts [flags...]
```

### Available Flags

#### Entity Flags

- `--bookmakers` - Seed bookmakers
- `--countries` - Seed countries
- `--leagues` - Seed leagues
- `--teams` - Seed teams
- `--seasons` - Seed seasons
- `--fixtures` - Seed fixtures
- `--odds` - Seed odds
- `--jobs` - Seed default jobs

#### Global Flags

- `--dry-run` - Run without making database changes (test mode)

#### Fixtures Options

- `--fixtures-season=<id>` - Seed fixtures for a specific season ID only
- `--fixtures-states=<states>` - Filter fixtures by state(s). Comma-separated list of state numbers (e.g., `1,2,3`). If not provided, fetches all fixture states.

**Fixture State Numbers (SportMonks API):**

- `1` - NS (Not Started) - Fixtures that haven't started yet
- `2` - LIVE - Fixtures currently in play
- `3` - HT (Half Time) - Fixtures at half time
- `4` - LIVE - Fixtures in second half
- `5` - FT (Finished) - Completed fixtures
- `6` - CAN (Cancelled) - Cancelled fixtures
- `7` - INT (Interrupted) - Interrupted fixtures
- `8` - ABAN (Abandoned) - Abandoned fixtures
- `9` - SUSP (Suspended) - Suspended fixtures
- `10` - AWARDED - Awarded fixtures
- `11` - WO (Walkover) - Walkover fixtures
- `12` - DELAYED - Delayed fixtures
- `13` - TBA (To Be Announced) - Fixtures to be announced
- `14` - POSTPONED - Postponed fixtures

**Note:** When `--fixtures-states` is not provided, all fixture states are fetched, which allows updating existing fixtures' states (e.g., NS → LIVE → FT).

#### Odds Options

- `--odds-from=<date>` - Start date for odds (format: `YYYY-MM-DD`, default: today)
- `--odds-to=<date>` - End date for odds (format: `YYYY-MM-DD`, default: today + 7 days)
- `--odds-filters=<filters>` - Custom filters (default: `bookmakers:1;markets:1,57;fixtureStates:1`)

## Examples

### Seed All Entities

```bash
# Seed everything in dependency order
pnpm --filter server seed
```

### Seed Specific Entities

```bash
# Seed only countries
pnpm --filter server seed -- --countries

# Seed countries and leagues
pnpm --filter server seed -- --countries --leagues

# Seed multiple entities
pnpm --filter server seed -- --countries --leagues --teams --seasons
```

### Dry Run

```bash
# Test what would be seeded without making changes
pnpm --filter server seed:dry

# Test specific entities
pnpm --filter server seed:dry -- --countries --leagues
```

### Fixtures

```bash
# Seed fixtures for all seasons (fetches all fixture states by default)
pnpm --filter server seed -- --fixtures

# Seed fixtures for a specific season
pnpm --filter server seed -- --fixtures --fixtures-season=12345

# Only fetch NS (Not Started) fixtures
pnpm --filter server seed -- --fixtures --fixtures-states=1

# Fetch multiple states (e.g., NS and LIVE)
pnpm --filter server seed -- --fixtures --fixtures-states=1,2

# Fetch only finished fixtures
pnpm --filter server seed -- --fixtures --fixtures-states=5

# Combine season and state filter
pnpm --filter server seed -- --fixtures --fixtures-season=12345 --fixtures-states=1,2,5

# Dry run for specific season with state filter
pnpm --filter server seed:dry -- --fixtures --fixtures-season=12345 --fixtures-states=1
```

### Odds

```bash
# Seed odds with default date range (today to +7 days)
pnpm --filter server seed -- --odds

# Seed odds for specific date range
pnpm --filter server seed -- --odds --odds-from=2025-01-01 --odds-to=2025-01-31

# Seed odds with custom filters
pnpm --filter server seed -- --odds --odds-filters="bookmakers:1,2;markets:1,57"

# Combine all odds options
pnpm --filter server seed -- --odds \
  --odds-from=2025-01-01 \
  --odds-to=2025-01-31 \
  --odds-filters="bookmakers:1,2;markets:1,57;fixtureStates:1"
```

### Complex Examples

```bash
# Seed base entities first
pnpm --filter server seed -- --bookmakers --countries

# Then seed dependent entities
pnpm --filter server seed -- --leagues --teams --seasons

# Finally seed fixtures and odds
pnpm --filter server seed -- --fixtures --odds
```

## Seeding Order & Dependencies

The CLI automatically seeds entities in the correct dependency order:

```
1. bookmakers    (no dependencies)
2. countries     (no dependencies)
3. leagues       (depends on: countries)
4. teams         (depends on: countries)
5. seasons       (depends on: leagues)
6. fixtures      (depends on: leagues, seasons, teams)
7. odds          (depends on: fixtures)
8. jobs          (no dependencies)
```

### Dependency Warnings

When running individual seeds, the CLI will warn you if dependencies are missing:

```bash
# This will show a warning
pnpm --filter server seed -- --leagues
# ⚠️  WARNING: Leagues depend on countries. Make sure countries are seeded first.
```

**Best Practice:** When using `--all` or no flags, seeds run in the correct order automatically. When running individual seeds, ensure dependencies are seeded first.

## Environment Variables

The CLI requires the following environment variables to be set:

```bash
SPORTMONKS_API_TOKEN=your_token_here
SPORTMONKS_FOOTBALL_BASE_URL=https://api.sportmonks.com/v3/football
SPORTMONKS_CORE_BASE_URL=https://api.sportmonks.com/v3/core
SPORTMONKS_AUTH_MODE=query  # or "header"
```

## How It Works

1. **Flag Parsing**: The CLI parses command-line arguments to determine what to seed
2. **Dependency Validation**: Warns if dependencies are missing when running individual seeds
3. **Automatic Ordering**: Always seeds in dependency order, even when multiple flags are used
4. **Dry Run Mode**: When `--dry-run` is used, no database changes are made (useful for testing)
5. **Error Handling**: Exits with code 0 on success, 1 on failure

## Tips

- **Always test with `--dry-run` first** before seeding production data
- **Seed dependencies first** when running individual seeds (or use `--all`)
- **Use specific season IDs** for fixtures to avoid seeding too much data
- **Adjust odds date ranges** to avoid API rate limits and large datasets
- **Combine flags** to seed multiple entities in one command

## Troubleshooting

### "Route not found" or API errors

- Check that `SPORTMONKS_API_TOKEN` is set correctly
- Verify API base URLs are correct
- Ensure you have API quota remaining

### Database errors

- Make sure the database is running and accessible
- Check that migrations have been run
- Verify database connection string in environment variables

### Dependency errors

- Seed entities in dependency order
- Or use `--all` to let the CLI handle ordering automatically
