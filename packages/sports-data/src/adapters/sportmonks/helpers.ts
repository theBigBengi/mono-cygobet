import { setTimeout as sleep } from "node:timers/promises";

import { SportsDataError } from "../../errors";

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

/**
 * HTTP client for making requests to SportMonks API
 * Handles authentication, pagination, retries, and query parameter building
 */
export class SMHttp {
  constructor(
    private token: string,
    private baseUrl: string,
    private authMode: "query" | "header"
  ) {}

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
      perPage = 50,
      page = 1,
      retries = 3,
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
          res = await fetch(url, {
            headers:
              this.authMode === "header"
                ? {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/json",
                  }
                : { Accept: "application/json" },
          });
          if (!res.ok) {
            await res.text(); // Consume body
            if (res.status === 429 || res.status >= 500) {
              attempt++;
              if (attempt > retries) {
                if (res.status === 429) {
                  throw new SportsDataError(
                    "RATE_LIMIT",
                    "Rate limit exceeded",
                    429
                  );
                }
                throw new SportsDataError(
                  "SERVER_ERROR",
                  "Server error",
                  res.status
                );
              }
              await sleep(300 * attempt); // Exponential backoff
              continue;
            }
            throw new SportsDataError(
              "UNKNOWN",
              "Request failed",
              res.status
            );
          }
          break;
        } catch (err) {
          attempt++;
          if (attempt > retries) {
            if (err instanceof SportsDataError) throw err;
            throw new SportsDataError(
              "NETWORK_ERROR",
              "Network request failed",
              undefined,
              err
            );
          }
          await sleep(300 * attempt);
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
