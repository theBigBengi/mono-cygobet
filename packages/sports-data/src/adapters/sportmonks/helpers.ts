import { setTimeout as sleep } from "node:timers/promises";

import { CircuitBreaker } from "../../circuit-breaker";
import { SportsDataError } from "../../errors";
import { Semaphore } from "../../semaphore";
import type { SportsDataLogger } from "../../logger";
import { noopLogger } from "../../logger";

/** Environment-backed configuration defaults */

import type {
  FixtureSportmonks,
  ParticipantsSportmonks,
  ScoreSportmonks,
} from "./sportmonks.types";
import {
  OddsDTO,
  FixtureDTO,
  FixtureState,
} from "@repo/types/sport-data/common";

// SportMonks has separate APIs for different data types

/* ---------------------- HTTP Client Helper (Internal) ---------------------- */

/**
 * Represents an include relationship in SportMonks API
 * SportMonks uses includes to fetch related data in a single request
 * Examples:
 * - "state" - include fixture state
 * - { name: "participants", fields: ["team_id", "position"] } - include participants with specific fields
 * - { name: "scores", include: [{ name: "periods" }] } - nested includes
 */
export type IncludeNode =
  | string
  | { name: string; fields?: string[]; include?: IncludeNode[] };

/**
 * Request options for SportMonks API calls
 * These map to SportMonks v3 query parameters
 */
export type RequestOpts = {
  include?: IncludeNode[]; // Related data to include (e.g., "state,participants")
  select?: string[]; // Specific fields to return (e.g., ["id", "name"])
  filters?: string | Record<string, string | number | boolean>; // Filter criteria
  sortBy?: string; // Field to sort by
  order?: "asc" | "desc"; // Sort order
  perPage?: number; // Items per page (max 50)
  page?: number; // Page number
  retries?: number; // Retry attempts on failure
  paginate?: boolean; // Whether to fetch all pages automatically
};

/**
 * SportMonks pagination response structure
 */
export type Pagination = {
  has_more?: boolean;
  current_page?: number;
  next_page?: string | null;
};

/**
 * Standard SportMonks API response format
 */
export type SMResponse<T> = { data: T[] | T; pagination?: Pagination };

/** Options for SMHttp constructor (avoids 7 positional parameters) */
export type SMHttpOptions = {
  logger?: SportsDataLogger;
  defaultRetries?: number;
  defaultPerPage?: number;
  retryDelayMs?: number;
  semaphore?: Semaphore;
};

const DEFAULT_HTTP_OPTIONS: Required<SMHttpOptions> = {
  logger: noopLogger,
  defaultRetries: 3,
  defaultPerPage: 50,
  retryDelayMs: 1000,
  semaphore: new Semaphore(10),
};

/**
 * HTTP client for making requests to SportMonks API
 * Handles authentication, pagination, retries, and query parameter building
 */
export class SMHttp {
  private readonly opts: Required<SMHttpOptions>;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private token: string,
    private baseUrl: string,
    private authMode: "query" | "header",
    options: SMHttpOptions = {}
  ) {
    this.opts = { ...DEFAULT_HTTP_OPTIONS, ...options };
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
    });
  }

  private get logger(): SportsDataLogger {
    return this.opts.logger;
  }

  private get defaultRetries(): number {
    return this.opts.defaultRetries;
  }

  private get defaultPerPage(): number {
    return this.opts.defaultPerPage;
  }

  private get retryDelayMs(): number {
    return this.opts.retryDelayMs;
  }

  /**
   * Ensures base URL ends with slash for proper URL construction
   */
  private normalizeBase(): string {
    return this.baseUrl.endsWith("/") ? this.baseUrl : this.baseUrl + "/";
  }

  /**
   * Builds the include parameter string for SportMonks API
   * Converts the IncludeNode structure to SportMonks format
   *
   * Examples:
   * - ["state"] → "state"
   * - [{ name: "participants", fields: ["team_id"] }] → "participants:team_id"
   * - [{ name: "scores", include: [{ name: "periods" }] }] → "scores;periods"
   */
  private buildIncludeParam(nodes?: IncludeNode[]): string | undefined {
    if (!nodes?.length) return;
    const parts: string[] = [];
    const walk = (node: IncludeNode, parent?: string) => {
      if (typeof node === "string") {
        parts.push(parent ? `${parent}.${node}` : node);
        return;
      }
      const full = parent ? `${parent}.${node.name}` : node.name;
      if (node.fields?.length) parts.push(`${full}:${node.fields.join(",")}`);
      else parts.push(full);
      node.include?.forEach((c) => walk(c, full));
    };
    nodes.forEach((n) => walk(n));
    return parts.join(";");
  }

  /**
   * Builds the filters parameter string for SportMonks API
   * Converts object filters to SportMonks format
   *
   * Examples:
   * - { country_id: 1 } → "country_id:1"
   * - { fixtureStates: "1,2" } → "fixtureStates:1,2"
   */
  private buildFiltersParam(
    filters?: string | Record<string, string | number | boolean>
  ): string | undefined {
    if (!filters) return;
    if (typeof filters === "string") return filters;
    return Object.entries(filters)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
  }

  /**
   * Constructs the full URL with query parameters
   * Handles authentication based on authMode
   */
  private buildUrl(
    path: string,
    q: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.normalizeBase());
    if (this.authMode === "query")
      url.searchParams.set("api_token", this.token);
    for (const [k, v] of Object.entries(q)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  /**
   * Main GET method for SportMonks API
   * Handles pagination, retries, and response processing
   */
  async get<T>(path: string, opts: RequestOpts = {}): Promise<T[]> {
    const {
      include,
      select,
      filters,
      sortBy,
      order,
      perPage = this.defaultPerPage,
      page = 1,
      retries = this.defaultRetries,
      paginate = true,
    } = opts;

    const includeParam = this.buildIncludeParam(include);
    const filtersParam = this.buildFiltersParam(filters);

    let cur = page;
    const out: T[] = [];

    // Handle pagination - fetch all pages if paginate=true, or single request if paginate=false
    do {
      const url = this.buildUrl(path, {
        include: includeParam,
        select: select?.length ? select.join(",") : undefined,
        filters: filtersParam,
        sortBy,
        order,
        per_page: Math.min(Math.max(perPage, 1), 50), // SportMonks max is 50
        page: cur,
      });

      let attempt = 0;
      let res: Response | undefined;

      // Retry logic for rate limiting (429) and server errors (5xx)
      while (attempt <= retries) {
        try {
          this.circuitBreaker.assertClosed();
          res = await this.opts.semaphore.run(() =>
            fetch(url, {
              headers:
                this.authMode === "header"
                  ? {
                      Authorization: `Bearer ${this.token}`,
                      Accept: "application/json",
                    }
                  : { Accept: "application/json" },
            })
          );
          if (!res.ok) {
            await res.text(); // Consume body
            if (res.status === 429 || res.status >= 500) {
              if (res.status >= 500) this.circuitBreaker.recordFailure();
              attempt++;
              if (attempt > retries) {
                if (res.status === 429) {
                  this.logger.error("SMHttp get failed", {
                    code: "RATE_LIMIT",
                    statusCode: 429,
                  });
                  throw new SportsDataError(
                    "RATE_LIMIT",
                    "Rate limit exceeded",
                    429
                  );
                }
                this.logger.error("SMHttp get failed", {
                  code: "SERVER_ERROR",
                  statusCode: res.status,
                });
                throw new SportsDataError(
                  "SERVER_ERROR",
                  "Server error",
                  res.status
                );
              }
              // Respect Retry-After header (value in seconds) for 429
              if (res.status === 429) {
                const retryAfter = res.headers.get("Retry-After");
                if (retryAfter) {
                  const retryAfterMs = parseInt(retryAfter, 10) * 1000;
                  if (
                    Number.isFinite(retryAfterMs) &&
                    retryAfterMs > 0
                  ) {
                    this.logger.warn("SMHttp get retry (Retry-After)", {
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
                this.retryDelayMs * Math.pow(2, attempt - 1) + jitter;
              this.logger.warn("SMHttp get retry", {
                attempt,
                status: res.status,
                delayMs,
              });
              await sleep(delayMs);
              continue;
            }
            this.logger.error("SMHttp get failed", {
              code: "UNKNOWN",
              statusCode: res.status,
            });
            throw new SportsDataError(
              "UNKNOWN",
              "Request failed",
              res.status
            );
          }
          this.circuitBreaker.recordSuccess();
          break;
        } catch (err) {
          if (
            err instanceof SportsDataError &&
            err.code === "CIRCUIT_OPEN"
          ) {
            throw err;
          }
          // Only record failure for network errors (not re-thrown HTTP errors
          // that already recorded their failure in the if-block above)
          if (
            !(err instanceof SportsDataError) ||
            (err.code !== "SERVER_ERROR" && err.code !== "RATE_LIMIT")
          ) {
            this.circuitBreaker.recordFailure();
          }
          attempt++;
          if (attempt > retries) {
            if (err instanceof SportsDataError) {
              this.logger.error("SMHttp get failed", {
                code: err.code,
                statusCode: err.statusCode,
              });
              throw err;
            }
            this.logger.error("SMHttp get failed", {
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
            this.retryDelayMs * Math.pow(2, attempt - 1) + jitter;
          this.logger.warn("SMHttp get retry", {
            attempt,
            status: undefined,
            delayMs,
          });
          await sleep(delayMs);
        }
      }

      const json = (await res!.json()) as SMResponse<T>;
      const data = Array.isArray(json.data)
        ? json.data
        : [json.data].filter(Boolean);
      out.push(...data);

      // Stop pagination if no more pages or pagination disabled
      if (!paginate || !json.pagination?.has_more) break;
      cur++;
    } while (paginate); // Continue only if pagination is enabled

    return out;
  }
}

/* ----------------------- Fixture Data Mapping Helpers ----------------------- */

/**
 * Maps SportMonks fixture state to our internal FixtureState enum
 * SportMonks uses various state names, so we normalize them to our 5-state system:
 * - NS (Not Started)
 * - INPLAY_1ST_HALF (First Half)
 * - HT (Half Time)
 * - INPLAY_2ND_HALF (Second Half)
 * - FT (Finished)
 */
export function mapSmShortToApp(
  stateType?: string | null
): "NS" | "LIVE" | "CAN" | "FT" {
  const s = (stateType ?? "").toLowerCase();

  // Not started states
  if (["not_started", "scheduled", "ns", "pre_match"].includes(s)) return "NS";

  // Half time states
  if (["half_time", "halftime", "ht"].includes(s)) return "LIVE";

  // Finished states
  if (["finished", "ft", "fulltime", "full_time"].includes(s)) return "FT";

  // First half states (SportMonks has various naming conventions)
  if (
    s.includes("1st") ||
    s.includes("first") ||
    s.includes("h1") ||
    s === "inplay_1st_half"
  )
    return "LIVE";

  // Second half states
  if (
    s.includes("2nd") ||
    s.includes("second") ||
    s.includes("h2") ||
    s === "inplay_2nd_half"
  )
    return "LIVE";

  // Default fallback for unknown live states
  return "CAN";
}

/**
 * Extracts the best available score from SportMonks scores array
 * SportMonks provides multiple score types (current, fulltime, etc.)
 * Priority: Fulltime > Current > First available
 */
export function pickScoreString(
  scores: ScoreSportmonks[] | undefined
): string | null {
  if (!Array.isArray(scores) || scores.length === 0) return null;
  const fulltimeScores = scores.filter((s) => s.type_id === 1525);

  // Extract home and away scores from fulltimeScores
  const homeScore = fulltimeScores.find(
    (s) => s.score.participant.toLowerCase() === "home"
  )?.score.goals;
  const awayScore = fulltimeScores.find(
    (s) => s.score.participant.toLowerCase() === "away"
  )?.score.goals;

  return `${homeScore}:${awayScore}`;
}

/**
 * Extracts home and away team IDs from SportMonks participants array
 * SportMonks stores team relationships in participants with position metadata
 */
export function extractTeams(
  participants: ParticipantsSportmonks[] | undefined
): {
  homeId: number | null;
  awayId: number | null;
} {
  let homeId: number | null = null;
  let awayId: number | null = null;

  if (!participants) return { homeId, awayId };

  for (const p of participants) {
    const location = String(p?.meta?.location ?? "").toLowerCase();

    if (location === "home") homeId = p.id;
    else if (location === "away") awayId = p.id;
  }

  return { homeId, awayId };
}

export function buildOdds(f: FixtureSportmonks): OddsDTO[] {
  const odds = f.odds;
  if (!Array.isArray(odds)) return [];

  const out: OddsDTO[] = [];

  for (const o of odds) {
    out.push({
      bookmakerId: o.bookmaker_id,
      marketExternalId: o.market_id,
      externalId: o.id,
      name: o.name,
      value: o.value,
      marketDescription: o.market_description,
      marketName: o.market?.name,
      winning: o.winning,
      startingAt: f.starting_at,
      startingAtTs: f.starting_at_timestamp,
      probability: o.probability,
      total: o.total,
      handicap: o.handicap,
      label: o.label,
      sortOrder: o.sort_order,
      bookmakerExternalId: o.bookmaker_id,
      bookmakerName: o.bookmaker?.name,
      fixtureExternalId: f.id,
      fixtureName: f.name,
    });
  }

  return out;
}

/**
 * Builds FixtureDTO from raw SportMonks fixture data
 * Transforms raw API response to our standardized DTO format
 */
export function buildFixtures(f: FixtureSportmonks): FixtureDTO | null {
  const { homeId, awayId } = extractTeams(f.participants);
  if (!homeId || !awayId) return null;

  return {
    externalId: Number(f.id),
    name: String(f.name ?? ""),
    leagueExternalId: Number.isFinite(f.league_id) ? Number(f.league_id) : null,
    seasonExternalId: Number.isFinite(f.season_id) ? Number(f.season_id) : null,
    homeTeamExternalId: homeId,
    awayTeamExternalId: awayId,
    startIso: f.starting_at ?? null,
    startTs: coerceEpochSeconds(f.starting_at_timestamp, f.starting_at),
    state: mapSmShortToApp(f?.state?.short_name) as FixtureState,
    result: pickScoreString(f?.scores),
    stage: f?.stage?.name ?? null,
    round: f?.round?.name ?? null,
    hasOdds: f.has_odds,
    leagueName: f.league?.name ?? "",
    countryName: f.league?.country?.name ?? "",
  };
}

/**
 * Converts SportMonks timestamp fields to Unix epoch seconds
 * SportMonks provides both timestamp and ISO string formats
 */
export function coerceEpochSeconds(
  starting_at_timestamp: number | null | undefined,
  starting_at: string | null | undefined
): number {
  if (Number.isFinite(starting_at_timestamp))
    return Number(starting_at_timestamp);
  const ms = Date.parse(starting_at ?? "");
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}
