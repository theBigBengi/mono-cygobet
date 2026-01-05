# Seeding Order Guide

This document outlines the correct order for seeding entities based on foreign key dependencies.

## Dependency Graph

```
countries (no dependencies)
  ├── leagues (countryId)
  │   └── seasons (leagueId)
  │       └── fixtures (seasonId)
  └── teams (countryId, nullable)
      └── fixtures (homeTeamId, awayTeamId)
```

## Seeding Order

### 1. **countries** (First - No dependencies)

- No foreign keys
- Can be seeded independently
- Required by: `leagues`, `teams`

### 2. **leagues** (After countries)

- Foreign key: `countryId` → `countries.id`
- Required by: `seasons`, `fixtures`

### 3. **teams** (After countries, can run parallel with leagues)

- Foreign key: `countryId` → `countries.id` (nullable)
- Required by: `fixtures` (homeTeamId, awayTeamId)

### 4. **seasons** (After leagues)

- Foreign key: `leagueId` → `leagues.id`
- Required by: `fixtures`

### 5. **fixtures** (After leagues, seasons, and teams)

- Foreign keys:
  - `leagueId` → `leagues.id` (nullable)
  - `seasonId` → `seasons.id` (nullable)
  - `homeTeamId` → `teams.id` (required)
  - `awayTeamId` → `teams.id` (required)

## CLI Usage

### Automatic Order (Recommended)

When using `--all` or no flags, seeds run in the correct order automatically:

```bash
pnpm seed              # Seeds all in correct order
pnpm seed:dry          # Dry-run all in correct order
```

### Individual Seeds

When seeding individual entities, ensure dependencies are seeded first:

```bash
# Correct order:
pnpm seed:countries
pnpm seed:leagues      # Requires countries
pnpm seed:teams        # Requires countries
pnpm seed:seasons      # Requires leagues
pnpm seed:fixtures     # Requires leagues, seasons, teams
```

### Parallel Seeding

Some entities can be seeded in parallel after their dependencies:

```bash
# After countries are seeded, leagues and teams can run in parallel:
pnpm seed:countries
# Then in parallel:
pnpm seed:leagues & pnpm seed:teams
```

## Notes

- The CLI will warn you if you try to seed an entity without its dependencies
- When using `--all`, the order is automatically enforced
- Foreign key constraints will cause errors if dependencies are missing
- Some foreign keys are nullable (e.g., `fixtures.leagueId`, `fixtures.seasonId`), but it's still recommended to seed them in order
