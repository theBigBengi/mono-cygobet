# Missing Dependencies Behavior

This document explains what happens when you try to seed an entity that depends on another entity that doesn't exist in the database.

## Behavior Summary

The seed functions handle missing dependencies differently based on whether the foreign key is **required** (NOT NULL) or **optional** (nullable):

### Required Foreign Keys → **FAILS with Error**
- The item is **not inserted**
- Error is logged and tracked
- Item is marked as `failed` in seed tracking
- Error message includes which dependency is missing

### Optional Foreign Keys → **SUCCEEDS with NULL**
- The item **is inserted** with `null` for the missing foreign key
- Item is marked as `success` in seed tracking
- No error is thrown

## Detailed Behavior by Entity

### 1. **Leagues** (depends on `countries`)

**Foreign Key:** `countryId` → `countries.id` (REQUIRED)

**Behavior when country is missing:**
```typescript
// Error thrown:
throw new Error(
  `No valid country ID found for league ${league.name} (externalId: ${league.externalId})`
);
```

**Result:**
- ❌ League is **NOT inserted**
- ❌ Item marked as `failed`
- ✅ Error tracked in `seedItems` table
- ✅ Error message logged to console

**Example:**
```bash
❌ [123] League failed: Premier League (ID: 8) - No valid country ID found for league Premier League (externalId: 8)
```

---

### 2. **Teams** (depends on `countries`)

**Foreign Key:** `countryId` → `countries.id` (OPTIONAL/nullable)

**Behavior when country is missing:**
```typescript
// No error thrown - countryId is set to null
countryId: countryId ?? null  // null if country not found
```

**Result:**
- ✅ Team **IS inserted** with `countryId = null`
- ✅ Item marked as `success`
- ⚠️ Team exists but has no country association

**Example:**
```bash
✅ [123] Team seeded: Manchester United (ID: 85) - Success
# Note: countryId is null in database
```

---

### 3. **Seasons** (depends on `leagues`)

**Foreign Key:** `leagueId` → `leagues.id` (REQUIRED)

**Behavior when league is missing:**
```typescript
// Error thrown:
throw new Error(
  `League not found for season ${season.name} (leagueExternalId: ${season.leagueExternalId})`
);
```

**Result:**
- ❌ Season is **NOT inserted**
- ❌ Item marked as `failed`
- ✅ Error tracked in `seedItems` table
- ✅ Error message logged to console

**Example:**
```bash
❌ [123] Season failed: 2024/2025 (ID: 456) - League not found for season 2024/2025 (leagueExternalId: 8)
```

---

### 4. **Fixtures** (depends on `leagues`, `seasons`, `teams`)

**Foreign Keys:**
- `leagueId` → `leagues.id` (OPTIONAL/nullable)
- `seasonId` → `seasons.id` (OPTIONAL/nullable)
- `homeTeamId` → `teams.id` (REQUIRED)
- `awayTeamId` → `teams.id` (REQUIRED)

**Behavior when dependencies are missing:**

#### Missing League or Season:
```typescript
// No error - set to null
leagueId: leagueId ?? null
seasonId: seasonId ?? null
```

**Result:**
- ✅ Fixture **IS inserted** with `leagueId = null` and/or `seasonId = null`
- ✅ Item marked as `success`
- ⚠️ Fixture exists but has no league/season association

#### Missing Home Team or Away Team:
```typescript
// Error thrown:
if (!homeTeamId) {
  throw new Error(`Home team not found (externalId: ${fixture.homeTeamExternalId})`);
}
if (!awayTeamId) {
  throw new Error(`Away team not found (externalId: ${fixture.awayTeamExternalId})`);
}
```

**Result:**
- ❌ Fixture is **NOT inserted**
- ❌ Item marked as `failed`
- ✅ Error tracked in `seedItems` table
- ✅ Error message logged to console

**Example:**
```bash
❌ [123] Fixture failed: Man Utd vs Liverpool (ID: 789) - Home team not found (externalId: 85)
```

---

## Error Tracking

All failures are tracked in the database:

1. **`seedBatches` table:**
   - `itemsFailed` count increases
   - `status` may be `failed` if all items fail
   - `errorMessage` contains summary

2. **`seedItems` table:**
   - Individual item marked with `status = 'failed'`
   - `errorMessage` contains specific error
   - `meta` JSON contains error details

## Best Practices

1. **Always seed in dependency order** (see `SEEDING_ORDER.md`)
2. **Check seed batch results** after seeding:
   ```typescript
   const result = await seedLeagues(leagues);
   console.log(`Success: ${result.ok}, Failed: ${result.fail}`);
   ```
3. **Review failed items** in `seedItems` table for specific errors
4. **Use dry-run mode** first to identify missing dependencies:
   ```bash
   pnpm seed:leagues:dry
   ```

## Database Constraints

Even if the seed function allows null values, the database schema may have constraints:

- **Foreign key constraints** will prevent invalid references
- **NOT NULL constraints** will cause database errors if violated
- **Unique constraints** may prevent duplicates

The seed functions handle these gracefully by catching database errors and tracking them.

