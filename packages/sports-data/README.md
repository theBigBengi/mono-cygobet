# @repo/sports-data

Provider-agnostic sports data layer. Exposes a single interface (`ISportsDataAdapter`) that consumers code against, while the concrete provider (SportMonks, API-Football, etc.) is selected at runtime via a factory.

**Architecture:** Interface → Factory → Adapter

```
Consumer  ──▶  ISportsDataAdapter  ◀── implements ── SportMonksAdapter
                     ▲                                (or any future adapter)
                     │
              createSportsDataAdapter()
```

## Quick Start

```typescript
import {
  createSportsDataAdapter,
  type ISportsDataAdapter,
} from "@repo/sports-data";

const adapter: ISportsDataAdapter = createSportsDataAdapter({
  provider: "sportmonks",
  config: {
    token: process.env.SPORTMONKS_API_TOKEN,
    footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
    coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
    authMode: "query",
  },
});

// Fetch fixtures between two dates
const fixtures = await adapter.fetchFixturesBetween(
  "2024-06-01",
  "2024-06-07",
  { includeScores: true }
);
```

## API Reference — ISportsDataAdapter

### Fixtures

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchFixturesBetween` | `(startIso: string, endIso: string, opts?: FixtureFetchOptions) => Promise<FixtureDTO[]>` | Fixtures in a date range |
| `fetchFixturesByIds` | `(ids: number[], opts?: FixtureFetchOptions) => Promise<FixtureDTO[]>` | Fixtures by external IDs |
| `fetchFixtureById` | `(id: number) => Promise<FixtureDTO \| null>` | Single fixture (or `null`) |
| `fetchLiveFixtures` | `(opts?: FixtureFetchOptions) => Promise<FixtureDTO[]>` | Currently live fixtures |
| `fetchFixturesBySeason` | `(seasonId: number, opts?: FixturesBySeasonOptions) => Promise<FixtureDTO[]>` | All fixtures for a season |

### Odds

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchOddsBetween` | `(startIso: string, endIso: string, opts?: OddsFetchOptions) => Promise<OddsDTO[]>` | Odds in a date range |
| `fetchBookmakers` | `() => Promise<BookmakerDTO[]>` | All bookmakers |
| `fetchMarkets` | `() => Promise<MarketDTO[]>` | All markets |

### Reference Data

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchCountries` | `() => Promise<CountryDTO[]>` | All countries |
| `fetchCountryById` | `(id: number) => Promise<CountryDTO \| null>` | Single country |
| `fetchLeagues` | `() => Promise<LeagueDTO[]>` | All leagues |
| `fetchLeagueById` | `(id: number) => Promise<LeagueDTO \| null>` | Single league |
| `fetchSeasons` | `() => Promise<SeasonDTO[]>` | All seasons |
| `fetchSeasonById` | `(id: number) => Promise<SeasonDTO \| null>` | Single season |
| `fetchTeams` | `() => Promise<TeamDTO[]>` | All teams |
| `fetchTeamById` | `(id: number) => Promise<TeamDTO \| null>` | Single team |

All DTOs (`FixtureDTO`, `OddsDTO`, `CountryDTO`, etc.) are defined in `@repo/types/sport-data/common`.

## Options Types

### FixtureFetchOptions

```typescript
type FixtureFetchOptions = {
  includeScores?: boolean;   // include score data
  includeOdds?: boolean;     // include odds data
  filters?: Record<string, string | number | boolean>;
  perPage?: number;
  sortBy?: string;
  order?: "asc" | "desc";
};
```

### FixturesBySeasonOptions

Extends `FixtureFetchOptions` with:

```typescript
type FixturesBySeasonOptions = FixtureFetchOptions & {
  fixtureStates?: string;    // filter by fixture state IDs
};
```

### OddsFetchOptions

```typescript
type OddsFetchOptions = {
  filters?: string | Record<string, string | number | boolean>;
};
```

## Configuration

### AdapterConfig

Passed to `createSportsDataAdapter()`:

```typescript
type AdapterConfig = {
  provider: "sportmonks";          // only supported provider for now
  config?: Partial<SportMonksConfig>;
};
```

### SportMonksConfig

All fields are optional when passed to the factory — missing required values fall back to environment variables, and optional values have defaults.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `token` | `string` | Yes | `SPORTMONKS_API_TOKEN` env | API authentication token |
| `footballBaseUrl` | `string` | Yes | `SPORTMONKS_FOOTBALL_BASE_URL` env | Football API base URL |
| `coreBaseUrl` | `string` | Yes | `SPORTMONKS_CORE_BASE_URL` env | Core API base URL |
| `authMode` | `"query" \| "header"` | Yes | `SPORTMONKS_AUTH_MODE` env | How the token is sent |
| `defaultRetries` | `number` | No | `3` | Retry count on failure |
| `defaultPerPage` | `number` | No | `50` | Page size for paginated requests |
| `retryDelayMs` | `number` | No | `300` | Delay between retries (ms) |
| `logger` | `SportsDataLogger` | No | `noopLogger` | Logger instance |

### Environment Variables

If config fields are not passed explicitly, validation reads from `process.env`:

- `SPORTMONKS_API_TOKEN`
- `SPORTMONKS_FOOTBALL_BASE_URL`
- `SPORTMONKS_CORE_BASE_URL`
- `SPORTMONKS_AUTH_MODE`

## Error Handling

All adapter errors are wrapped in `SportsDataError`:

```typescript
import { SportsDataError } from "@repo/sports-data";

try {
  await adapter.fetchFixturesBetween(from, to);
} catch (err) {
  if (err instanceof SportsDataError) {
    console.error(err.code, err.message, err.statusCode);
  }
}
```

### SportsDataError

```typescript
class SportsDataError extends Error {
  readonly code: SportsDataErrorCode;
  readonly statusCode?: number;   // HTTP status (if applicable)
  readonly cause?: unknown;       // original error
}
```

### Error Codes

| Code | When | HTTP Status |
|------|------|-------------|
| `RATE_LIMIT` | Provider rate limit hit | 429 |
| `SERVER_ERROR` | Provider returned 5xx | 500–599 |
| `NETWORK_ERROR` | Request failed (timeout, DNS, etc.) | — |
| `UNKNOWN` | Anything else (bad config, unexpected) | varies |

### Retry Behavior

The HTTP layer retries failed requests automatically:

- Retries up to `defaultRetries` times (default: 3)
- Waits `retryDelayMs` between attempts (default: 300ms)
- Only retries on transient errors (network failures, 5xx)
- Throws `SportsDataError` after all retries are exhausted

## Logging

### SportsDataLogger Interface

```typescript
type SportsDataLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};
```

### Default: noopLogger

By default, the adapter uses `noopLogger` which discards all log calls silently.

### Injecting a Custom Logger

Pass any object matching `SportsDataLogger` — for example, a pino instance:

```typescript
import pino from "pino";
import { createSportsDataAdapter } from "@repo/sports-data";

const logger = pino({ name: "sports-data" });

const adapter = createSportsDataAdapter({
  provider: "sportmonks",
  config: {
    logger: {
      info: (msg, meta) => logger.info(meta, msg),
      warn: (msg, meta) => logger.warn(meta, msg),
      error: (msg, meta) => logger.error(meta, msg),
    },
  },
});
```

## Adding a New Provider

To add support for a new data provider (e.g. `api-football`):

1. **Create adapter directory:**
   ```
   packages/sports-data/src/adapters/api-football/
   ```

2. **Implement the interface:**
   ```typescript
   // api-football.adapter.ts
   import type { ISportsDataAdapter } from "../../adapter.interface";

   export class ApiFootballAdapter implements ISportsDataAdapter {
     // implement all methods from ISportsDataAdapter
   }
   ```

3. **Add a config type** (optional but recommended):
   ```typescript
   // api-football.config.ts
   export interface ApiFootballConfig { /* provider-specific fields */ }
   ```

4. **Register in the factory** (`adapter.factory.ts`):
   ```typescript
   export type AdapterConfig =
     | { provider: "sportmonks"; config?: Partial<SportMonksConfig> }
     | { provider: "api-football"; config?: Partial<ApiFootballConfig> };

   export function createSportsDataAdapter(opts?: AdapterConfig) {
     const provider = opts?.provider ?? "sportmonks";
     if (provider === "api-football") {
       const { ApiFootballAdapter } = require("./adapters/api-football/api-football.adapter");
       return new ApiFootballAdapter(opts?.config);
     }
     // ...
   }
   ```

5. **No consumer changes required** — jobs, routes, and other consumers only depend on `ISportsDataAdapter`.

## Architecture

```
packages/sports-data/src/
├── adapter.interface.ts       # ISportsDataAdapter + option types
├── adapter.factory.ts         # createSportsDataAdapter()
├── errors.ts                  # SportsDataError
├── logger.ts                  # SportsDataLogger + noopLogger
├── index.ts                   # public exports (generic only)
└── adapters/
    └── sportmonks/
        ├── sportmonks.adapter.ts   # SportMonksAdapter implements ISportsDataAdapter
        ├── sportmonks.config.ts    # SportMonksConfig + validateConfig()
        ├── sportmonks.types.ts     # raw SportMonks API response types
        └── helpers.ts              # HTTP client, DTO builders
```

**Key design rules:**
- `index.ts` exports only generic types — no provider-specific symbols leak out
- All public methods return DTOs from `@repo/types/sport-data/common`
- Error messages never contain provider names
- Provider-specific concepts (e.g. `IncludeNode`) stay inside the adapter directory
