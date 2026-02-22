import { setTimeout as sleep } from "node:timers/promises";

import { CircuitBreaker } from "../../circuit-breaker";
import { SportsDataError } from "../../errors";
import { Semaphore } from "../../semaphore";
import type { SportsDataLogger } from "../../logger";
import { noopLogger } from "../../logger";

import type {
  AFResponse,
  AFFixtureRaw,
  AFStandingRowRaw,
  AFOddsRaw,
  AFOddValueRaw,
} from "./api-football.types";
import {
  FixtureState,
  type FixtureDTO,
  type OddsDTO,
  type StandingDTO,
} from "@repo/types/sport-data/common";

/* ----------------------- Season ID Utilities ----------------------- */

/**
 * Compose a synthetic season externalId from league ID and year.
 * API-Football has no standalone season entity — a "season" is league+year.
 */
export function composeSeasonId(leagueId: number, year: number): string {
  return `${leagueId}_${year}`;
}

/**
 * Parse a composite season ID back into its components.
 * @throws SportsDataError if the format is invalid
 */
export function parseSeasonId(seasonId: string | number): {
  leagueId: number;
  year: number;
} {
  const str = String(seasonId);
  const idx = str.indexOf("_");
  if (idx < 1) {
    throw new SportsDataError(
      "UNKNOWN",
      `Invalid API-Football season ID: "${str}". Expected format: "{leagueId}_{year}"`
    );
  }
  const leagueId = Number(str.slice(0, idx));
  const year = Number(str.slice(idx + 1));
  if (!Number.isFinite(leagueId) || !Number.isFinite(year)) {
    throw new SportsDataError(
      "UNKNOWN",
      `Invalid API-Football season ID: "${str}". Could not parse leagueId/year.`
    );
  }
  return { leagueId, year };
}

/* ----------------------- State Mapping ----------------------- */

/**
 * Maps API-Football short status codes to our FixtureState enum.
 * See: https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
 */
const AF_STATUS_TO_STATE: Record<string, FixtureState> = {
  NS: FixtureState.NS,
  TBD: FixtureState.TBA,
  "1H": FixtureState.INPLAY_1ST_HALF,
  HT: FixtureState.HT,
  "2H": FixtureState.INPLAY_2ND_HALF,
  ET: FixtureState.INPLAY_ET,
  BT: FixtureState.EXTRA_TIME_BREAK,
  P: FixtureState.INPLAY_PENALTIES,
  FT: FixtureState.FT,
  AET: FixtureState.AET,
  PEN: FixtureState.FT_PEN,
  SUSP: FixtureState.SUSPENDED,
  INT: FixtureState.INTERRUPTED,
  PST: FixtureState.POSTPONED,
  CANC: FixtureState.CANCELLED,
  ABD: FixtureState.ABANDONED,
  AWD: FixtureState.AWARDED,
  WO: FixtureState.WO,
};

/** Reverse mapping: FixtureState → API-Football short status codes. */
const STATE_TO_AF_STATUS: Partial<Record<FixtureState, string>> = {};
for (const [afStatus, state] of Object.entries(AF_STATUS_TO_STATE)) {
  // First mapping wins (avoids overwriting)
  if (!(state in STATE_TO_AF_STATUS)) {
    STATE_TO_AF_STATUS[state] = afStatus;
  }
}

export function mapAfStatusToState(short: string | undefined): FixtureState {
  if (!short) return FixtureState.NS;
  return AF_STATUS_TO_STATE[short] ?? FixtureState.NS;
}

/**
 * Convert FixtureState[] to API-Football status filter string.
 * API-Football accepts dash-separated status codes: "1H-HT-2H"
 */
export function statesToAfFilter(states?: FixtureState[]): string | undefined {
  if (!states?.length) return undefined;
  const codes = states
    .map((s) => STATE_TO_AF_STATUS[s])
    .filter((c): c is string => c != null);
  if (!codes.length) return undefined;
  return [...new Set(codes)].join("-");
}

/* ----------------------- HTTP Client ----------------------- */

export type AFHttpOptions = {
  logger?: SportsDataLogger;
  defaultRetries?: number;
  retryDelayMs?: number;
  semaphore?: Semaphore;
};

const DEFAULT_HTTP_OPTIONS: Required<AFHttpOptions> = {
  logger: noopLogger,
  defaultRetries: 3,
  retryDelayMs: 1000,
  semaphore: new Semaphore(2),
};

/**
 * HTTP client for API-Football (api-sports.io) v3.
 * Auth via `x-apisports-key` header. Single base URL.
 * Handles pagination, retries, circuit-breaking, and error detection.
 */
export class AFHttp {
  private readonly opts: Required<AFHttpOptions>;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private apiKey: string,
    private baseUrl: string,
    options: AFHttpOptions = {}
  ) {
    this.opts = { ...DEFAULT_HTTP_OPTIONS, ...options };
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      logger: this.opts.logger,
      name: this.baseUrl,
    });
  }

  getStats(): {
    circuitBreaker: ReturnType<CircuitBreaker["getStats"]>;
    semaphore: ReturnType<Semaphore["getStats"]>;
  } {
    return {
      circuitBreaker: this.circuitBreaker.getStats(),
      semaphore: this.opts.semaphore.getStats(),
    };
  }

  private get logger(): SportsDataLogger {
    return this.opts.logger;
  }

  private normalizeBase(): string {
    return this.baseUrl.endsWith("/") ? this.baseUrl : this.baseUrl + "/";
  }

  private buildUrl(
    path: string,
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.normalizeBase());
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  /**
   * GET request with automatic pagination, retries, and error handling.
   * API-Football paginates via paging.current / paging.total.
   * Errors can appear inside a 200 response in the `errors` field.
   */
  async get<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    options: { retries?: number; paginate?: boolean } = {}
  ): Promise<T[]> {
    const { retries = this.opts.defaultRetries, paginate = true } = options;

    let currentPage = 1;
    const out: T[] = [];

    do {
      const url = this.buildUrl(path, { ...params, page: currentPage });
      let totalPages = 1;

      let attempt = 0;
      let res!: Response;

      while (attempt <= retries) {
        try {
          this.circuitBreaker.assertClosed();
          res = await this.opts.semaphore.run(() =>
            fetch(url, {
              headers: {
                "x-apisports-key": this.apiKey,
                Accept: "application/json",
              },
              signal: AbortSignal.timeout(30_000),
            })
          );

          if (!res.ok) {
            await res.text();
            if (res.status === 429 || res.status >= 500) {
              this.circuitBreaker.recordFailure();
              attempt++;
              if (attempt > retries) {
                if (res.status === 429) {
                  this.logger.error("AFHttp get failed", {
                    code: "RATE_LIMIT",
                    statusCode: 429,
                  });
                  throw new SportsDataError(
                    "RATE_LIMIT",
                    "Rate limit exceeded",
                    429
                  );
                }
                this.logger.error("AFHttp get failed", {
                  code: "SERVER_ERROR",
                  statusCode: res.status,
                });
                throw new SportsDataError(
                  "SERVER_ERROR",
                  "Server error",
                  res.status
                );
              }
              if (res.status === 429) {
                const retryAfter = res.headers.get("Retry-After");
                if (retryAfter) {
                  const retryAfterMs = parseInt(retryAfter, 10) * 1000;
                  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
                    this.logger.warn("AFHttp get retry (Retry-After)", {
                      attempt,
                      status: 429,
                      delayMs: retryAfterMs,
                    });
                    await sleep(retryAfterMs);
                    continue;
                  }
                }
              }
              const jitter = Math.floor(Math.random() * 200);
              const delayMs =
                this.opts.retryDelayMs * Math.pow(2, attempt - 1) + jitter;
              this.logger.warn("AFHttp get retry", {
                attempt,
                status: res.status,
                delayMs,
              });
              await sleep(delayMs);
              continue;
            }
            this.logger.error("AFHttp get failed", {
              code: "UNKNOWN",
              statusCode: res.status,
            });
            throw new SportsDataError("UNKNOWN", "Request failed", res.status);
          }
          this.circuitBreaker.recordSuccess();
          break;
        } catch (err) {
          if (err instanceof SportsDataError && err.code === "CIRCUIT_OPEN") {
            throw err;
          }
          if (
            !(err instanceof SportsDataError) ||
            (err.code !== "SERVER_ERROR" && err.code !== "RATE_LIMIT")
          ) {
            this.circuitBreaker.recordFailure();
          }
          attempt++;
          if (attempt > retries) {
            if (err instanceof SportsDataError) {
              this.logger.error("AFHttp get failed", {
                code: err.code,
                statusCode: err.statusCode,
              });
              throw err;
            }
            this.logger.error("AFHttp get failed", {
              code: "NETWORK_ERROR",
              statusCode: undefined,
            });
            throw new SportsDataError(
              "NETWORK_ERROR",
              "Network request failed",
              undefined,
              err
            );
          }
          const jitter = Math.floor(Math.random() * 200);
          const delayMs =
            this.opts.retryDelayMs * Math.pow(2, attempt - 1) + jitter;
          this.logger.warn("AFHttp get retry", {
            attempt,
            status: undefined,
            delayMs,
          });
          await sleep(delayMs);
        }
      }

      const json = (await res.json()) as AFResponse<T>;

      // API-Football returns errors inside a 200 response
      const hasErrors = Array.isArray(json.errors)
        ? json.errors.length > 0
        : Object.keys(json.errors ?? {}).length > 0;
      if (hasErrors) {
        const errorMsg = Array.isArray(json.errors)
          ? json.errors.join("; ")
          : Object.values(json.errors).join("; ");
        this.logger.error("AFHttp API error in response", { errors: errorMsg });
        throw new SportsDataError("UNKNOWN", `API error: ${errorMsg}`);
      }

      out.push(...json.response);
      totalPages = json.paging?.total ?? 1;

      if (!paginate || currentPage >= totalPages) break;
      currentPage++;
    } while (paginate);

    return out;
  }
}

/* ----------------------- Transformer Functions ----------------------- */

/**
 * Build FixtureDTO from raw API-Football fixture response.
 */
export function buildFixture(raw: AFFixtureRaw): FixtureDTO {
  const homeName = raw.teams.home?.name ?? "";
  const awayName = raw.teams.away?.name ?? "";
  const name = `${homeName} vs ${awayName}`;

  const homeScore = raw.goals.home;
  const awayScore = raw.goals.away;
  const result =
    homeScore != null && awayScore != null
      ? `${homeScore}:${awayScore}`
      : null;

  const state = mapAfStatusToState(raw.fixture.status?.short);

  // Compose season ID from league.id + league.season
  const seasonExternalId =
    raw.league.id != null && raw.league.season != null
      ? composeSeasonId(raw.league.id, raw.league.season)
      : null;

  return {
    externalId: raw.fixture.id,
    name,
    leagueExternalId: raw.league.id ?? null,
    seasonExternalId,
    homeTeamExternalId: raw.teams.home.id,
    awayTeamExternalId: raw.teams.away.id,
    startIso: raw.fixture.date ?? null,
    startTs: raw.fixture.timestamp ?? 0,
    state,
    liveMinute: raw.fixture.status?.elapsed ?? null,
    result,
    homeScore,
    awayScore,
    homeScore90: raw.score.fulltime?.home ?? homeScore,
    awayScore90: raw.score.fulltime?.away ?? awayScore,
    homeScoreET: raw.score.extratime?.home ?? null,
    awayScoreET: raw.score.extratime?.away ?? null,
    penHome: raw.score.penalty?.home ?? null,
    penAway: raw.score.penalty?.away ?? null,
    stage: null, // API-Football doesn't expose a stage name directly
    round: raw.league.round ?? null,
    leg: null, // Not directly available
    aggregateId: null, // Not directly available
    hasOdds: false, // Would need a separate odds call
    leagueName: raw.league.name ?? "",
    countryName: raw.league.country ?? "",
    countryExternalId: null, // API-Football uses country name, not ID
  };
}

/**
 * Build StandingDTO from an API-Football standing row.
 */
export function buildStanding(
  raw: AFStandingRowRaw,
  leagueId: number,
  year: number
): StandingDTO {
  return {
    teamExternalId: raw.team.id,
    teamName: raw.team.name ?? "",
    teamImagePath: raw.team.logo ?? null,
    teamShortCode: null, // Not provided by API-Football standings
    position: raw.rank,
    points: raw.points,
    played: raw.all.played,
    won: raw.all.win,
    drawn: raw.all.draw,
    lost: raw.all.lose,
    goalsFor: raw.all.goals.for,
    goalsAgainst: raw.all.goals.against,
    goalDifference: raw.goalsDiff,
    form: raw.form ?? null,
    seasonExternalId: composeSeasonId(leagueId, year),
    leagueExternalId: leagueId,
    stageExternalId: null,
    groupExternalId: raw.group ?? null,
  };
}

/**
 * Build OddsDTO[] from an API-Football odds response.
 * API-Football nests odds under bookmakers → bets → values.
 * We synthesize a unique externalId for each odd value.
 */
export function buildOdds(raw: AFOddsRaw): OddsDTO[] {
  const out: OddsDTO[] = [];
  const fixtureId = raw.fixture.id;
  const fixtureName = `Fixture ${fixtureId}`;

  for (const bookmaker of raw.bookmakers ?? []) {
    for (const bet of bookmaker.bets ?? []) {
      for (const val of bet.values ?? []) {
        // Synthesize a unique ID from fixture + bookmaker + bet + value
        const syntheticId = `${fixtureId}_${bookmaker.id}_${bet.id}_${val.value}`;
        out.push({
          bookmakerId: bookmaker.id,
          marketExternalId: bet.id,
          externalId: syntheticId,
          name: bet.name,
          value: val.odd,
          marketDescription: bet.name,
          marketName: bet.name,
          winning: false, // Not provided in pre-match odds
          startingAt: raw.fixture.date,
          startingAtTs: raw.fixture.timestamp,
          probability: "",
          total: null,
          handicap: null,
          label: val.value,
          sortOrder: 0,
          bookmakerExternalId: bookmaker.id,
          bookmakerName: bookmaker.name,
          fixtureExternalId: fixtureId,
          fixtureName,
        });
      }
    }
  }

  return out;
}
