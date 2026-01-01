// src/adapters/sportmonks.adapter.ts
// Implementation of SportsDataAdapter for SportMonks v3 API.
//
// SportMonks API Structure:
// - CORE API: Contains countries and other core data
// - FOOTBALL API: Contains leagues, teams, seasons, fixtures, and football-specific data
// - Bookmakers: Currently hardcoded to bet365 (not available in SportMonks API)
//
// This adapter implements the SportsDataAdapter interface to provide a unified
// way to fetch sports data regardless of the underlying provider.

import type {
  BookmakerDTO,
  CountryDTO,
  OddsDTO,
  FixtureDTO,
  FixtureState,
  LeagueDTO,
  SeasonDTO,
  TeamDTO,
} from "@repo/types/sport-data/common";
import { FixtureSportmonks } from "@repo/types/sport-data/sportmonks";
import {
  SMHttp,
  IncludeNode,
  mapSmShortToApp,
  pickScoreString,
  extractTeams,
  buildOdds,
  coerceEpochSeconds,
} from "./helpers";

import dotenv from "dotenv";
dotenv.config();
/* ----------------------- SportMonksAdapter Implementation ----------------------- */

console.log(process.env.SPORTMONKS_API_TOKEN);

/**
 * Main adapter class that implements SportsDataAdapter interface
 * Provides unified access to SportMonks football and core APIs
 */
export class SportMonksAdapter {
  private httpFootball: SMHttp; // For football-specific endpoints
  private httpCore: SMHttp; // For core endpoints (countries, etc.)

  constructor(
    opts: {
      token?: string;
      footballBaseUrl?: string;
      coreBaseUrl?: string;
      authMode?: "query" | "header";
    } = {}
  ) {
    const token = opts.token ?? process.env.SPORTMONKS_API_TOKEN;
    if (!token) throw new Error("SPORTMONKS_API_TOKEN is required");

    const authMode =
      opts.authMode ?? (process.env.SPORTMONKS_AUTH_MODE as "query" | "header");
    if (!authMode) throw new Error("SPORTMONKS_AUTH_MODE is required");

    const footballBaseUrl =
      opts.footballBaseUrl ?? process.env.SPORTMONKS_FOOTBALL_BASE_URL;
    if (!footballBaseUrl)
      throw new Error("SPORTMONKS_FOOTBALL_BASE_URL is required");
    const coreBaseUrl =
      opts.coreBaseUrl ?? process.env.SPORTMONKS_CORE_BASE_URL;
    if (!coreBaseUrl) throw new Error("SPORTMONKS_CORE_BASE_URL is required");

    // Initialize HTTP clients for both APIs
    this.httpFootball = new SMHttp(token, footballBaseUrl, authMode);
    this.httpCore = new SMHttp(token, coreBaseUrl, authMode);
  }

  /** Standard includes for fixture requests to get related data */
  private fixtureInclude: IncludeNode[] = [
    {
      name: "participants",
    },
    {
      name: "league",
      include: [{ name: "country" }],
    },
    {
      name: "stage",
      fields: ["name"],
    },
    {
      name: "round",
      fields: ["name"],
    },
    {
      name: "state",
    },
  ];

  /* ----------------------- Fixture Methods ----------------------- */

  /**
   * Fetches all fixtures for a specific season (for backfill operations)
   * Uses the seasons/{id} endpoint with fixtures include
   *
   * Note: SportMonks season entity cannot be sorted by related fields,
   * so we don't use sortBy/order here
   */
  async fetchFixturesBySeason(
    seasonExternalId: number,
    options: {
      fixtureStates?: string;
      include?: IncludeNode[];
    } = {}
  ): Promise<FixtureDTO[]> {
    const rows = await this.httpFootball.get<any>(
      `seasons/${seasonExternalId}`,
      {
        include: [
          {
            name: "fixtures",
            include: [
              { name: "state", fields: ["id", "short_name"] },
              { name: "participants", fields: ["id"] }, // meta always present
              { name: "round", fields: ["name"] },
              { name: "stage", fields: ["name"] },
            ],
          },
          ...(options.include ?? []),
        ],
        filters: {
          fixtureStates: options.fixtureStates ?? "1", // Filter for only upcoming fixtures (NS)
        },
      }
    );

    const out: FixtureDTO[] = [];
    for (const r of rows) {
      const fixtures = r.fixtures;
      for (const f of fixtures) {
        // Extract home/away team IDs from participants
        let homeId: number | null = null;
        let awayId: number | null = null;
        if (Array.isArray((f as any).participants)) {
          for (const p of (f as any).participants) {
            const location = String(p?.meta?.location ?? "").toLowerCase();

            if (location === "home") homeId = p.id;
            else if (location === "away") awayId = p.id;
          }
        }

        out.push({
          externalId: Number(f.id),
          name: f.name ?? "",
          leagueExternalId: Number.isFinite(f.league_id)
            ? Number(f.league_id)
            : null,
          seasonExternalId: Number.isFinite(f.season_id)
            ? Number(f.season_id)
            : null,
          homeTeamExternalId: homeId ?? 0,
          awayTeamExternalId: awayId ?? 0,
          startIso: f.starting_at ?? null,
          startTs: Number.isFinite(f.starting_at_timestamp)
            ? Number(f.starting_at_timestamp)
            : 0,
          state: mapSmShortToApp(f?.state?.short_name) as FixtureState,
          stageRoundName: `${f?.stage?.name} - ${f?.round?.name}`,
        });
      }
    }
    return out;
  }

  /**
   * Fetches fixtures between two ISO datetime strings (for incremental updates)
   * Uses the fixtures/between/{from}/{to} endpoint
   * This is the preferred method for getting fixtures in a date range
   */
  async fetchFixturesBetween(
    startIso: string,
    endIso: string,
    options: {
      include?: IncludeNode[];
      perPage?: number;
      filters?: string | Record<string, string | number | boolean>;
    } = {}
  ): Promise<FixtureDTO[]> {
    // URL encode the ISO strings for the endpoint
    const encodedFrom = encodeURIComponent(startIso);
    const encodedTo = encodeURIComponent(endIso);

    const rows = await this.httpFootball.get<any>(
      `fixtures/between/${encodedFrom}/${encodedTo}`,
      {
        // select: this.fixtureSelect,
        include: [...this.fixtureInclude, ...(options.include ?? [])],
        filters: options.filters,
        perPage: 50,
        sortBy: "starting_at",
        order: "asc",
      }
    );

    const out: FixtureDTO[] = [];

    for (const f of rows) {
      // Extract home/away team IDs from participants
      let homeId: number | null = null;
      let awayId: number | null = null;

      for (const p of (f as any).participants) {
        const location = String(p?.meta?.location ?? "").toLowerCase();

        if (location === "home") homeId = p.id;
        else if (location === "away") awayId = p.id;
      }

      if (!homeId || !awayId) continue;

      out.push({
        externalId: Number(f.id),
        name: String(f.name ?? ""),
        leagueExternalId: Number.isFinite(f.league_id)
          ? Number(f.league_id)
          : null,
        seasonExternalId: Number.isFinite(f.season_id)
          ? Number(f.season_id)
          : null,
        homeTeamExternalId: homeId,
        awayTeamExternalId: awayId,
        startIso: f.starting_at ?? null,
        startTs: coerceEpochSeconds(f.starting_at_timestamp, f.starting_at),
        state: mapSmShortToApp(f?.state?.short_name) as FixtureState,
        result: pickScoreString(f?.scores),
        stageRoundName: `${f?.stage?.name} - ${f?.round?.name}`,
      });
    }
    return out;
  }

  async fetchOddsBetween(
    startIso: string,
    endIso: string,
    options: {
      include?: IncludeNode[];
      perPage?: number;
      filters?: string | Record<string, string | number | boolean>;
    } = {}
  ): Promise<OddsDTO[]> {
    // URL encode the ISO strings for the endpoint
    const encodedFrom = encodeURIComponent(startIso);
    const encodedTo = encodeURIComponent(endIso);

    const rows = await this.httpFootball.get<FixtureSportmonks>(
      `fixtures/between/${encodedFrom}/${encodedTo}`,
      {
        // select: this.fixtureSelect,
        include: [
          {
            name: "odds",
            include: [{ name: "bookmaker" }, { name: "market" }],
          },
        ],
        filters: options.filters,
        perPage: 50,
        sortBy: "starting_at",
        order: "asc",
      }
    );

    let out: OddsDTO[] = [];

    for (const f of rows) {
      out = [...out, ...buildOdds(f)];
    }
    return out;
  }

  /**
   * Fetches currently live fixtures
   * Uses /fixtures/live endpoint
   */
  async fetchLiveFixtures(options?: {
    select?: string[];
    include?: IncludeNode[];
    perPage?: number;
    filters?: string | Record<string, string | number | boolean>;
  }): Promise<FixtureDTO[]> {
    const rows = await this.httpFootball.get<any>("livescores/inplay", {
      include: [...this.fixtureInclude, ...(options?.include ?? [])],
      perPage: options?.perPage ?? 50,
    });

    const out: FixtureDTO[] = [];

    for (const f of rows) {
      let homeId: number | null = null;
      let awayId: number | null = null;

      for (const p of (f as any).participants ?? []) {
        const location = String(p?.meta?.location ?? "").toLowerCase();
        if (location === "home") homeId = p.id;
        else if (location === "away") awayId = p.id;
      }

      if (!homeId || !awayId) continue;

      out.push({
        externalId: Number(f.id),
        name: String(f.name ?? ""),
        leagueExternalId: Number.isFinite(f.league_id)
          ? Number(f.league_id)
          : null,
        seasonExternalId: Number.isFinite(f.season_id)
          ? Number(f.season_id)
          : null,
        homeTeamExternalId: homeId,
        awayTeamExternalId: awayId,
        startIso: f.starting_at ?? null,
        startTs: coerceEpochSeconds(f.starting_at_timestamp, f.starting_at),
        state: mapSmShortToApp(f?.state?.short_name) as FixtureState, // will resolve to LIVE
        result: pickScoreString(f?.scores),
        stageRoundName: `${f?.stage?.name} - ${f?.round?.name}`,
      });
    }

    return out;
  }

  /**
   * Fetches a single fixture by ID from SportMonks Football API
   *
   * This method wraps fetchFixturesByIds to provide a convenient way to fetch
   * a single fixture. It includes all necessary related data (participants,
   * state, league, round, stage, scores) for complete fixture information.
   *
   * @param id - The SportMonks fixture external ID
   * @returns FixtureDTO or null if not found or on error
   *
   * @example
   * ```typescript
   * const fixture = await adapter.fetchFixtureById(12345);
   * if (fixture) {
   *   console.log(fixture.name, fixture.state);
   * }
   * ```
   */
  async fetchFixtureById(id: number): Promise<FixtureDTO | null> {
    try {
      // Use fetchFixturesByIds with a single ID and include all related data
      const fixtures = await this.fetchFixturesByIds([id], {
        include: [
          {
            name: "participants", // Home and away team information
          },
          {
            name: "state", // Fixture state (NS, LIVE, FT, etc.)
            fields: ["id", "short_name"],
          },
          {
            name: "league", // League information
            include: [{ name: "country" }], // Include country for league
          },
          {
            name: "round", // Round name (e.g., "Round 1")
            fields: ["name"],
          },
          {
            name: "stage", // Stage name (e.g., "Regular Season")
            fields: ["name"],
          },
          "scores", // Score information for finished fixtures
        ],
      });

      // Return the first fixture if found, otherwise null
      // Use nullish coalescing to handle potential undefined value
      return fixtures.length > 0 ? (fixtures[0] ?? null) : null;
    } catch (error) {
      // Return null if fixture not found or any other error occurs
      // This allows callers to handle missing fixtures gracefully
      return null;
    }
  }

  /**
   * Fetches specific fixtures by their SportMonks IDs
   * Uses the fixtures endpoint with id:in filter
   * Useful for targeted re-sync of specific matches
   */

  async fetchFixturesByIds(
    externalIds: number[],
    options?: {
      select?: string[];
      include?: IncludeNode[];
      perPage?: number;
      filters?: string | Record<string, string | number | boolean>;
    }
  ): Promise<FixtureDTO[]> {
    if (!externalIds?.length) return [];

    const rows = await this.httpFootball.get<any>(
      `fixtures/multi/${externalIds.join(",")}`,
      options
    );

    const out: FixtureDTO[] = [];
    for (const f of rows) {
      const fixture: any = {
        externalId: Number(f.id),
        name: String(f.name ?? ""),
        leagueExternalId: Number.isFinite(f.league_id)
          ? Number(f.league_id)
          : null,
        seasonExternalId: Number.isFinite(f.season_id)
          ? Number(f.season_id)
          : null,

        startIso: f.starting_at ?? null,
        startTs: coerceEpochSeconds(f.starting_at_timestamp, f.starting_at),
        state: mapSmShortToApp(f?.state?.short_name) as FixtureState,
      };

      if (options?.include?.includes("scores")) {
        fixture.result =
          f.state?.short_name === "FT" ? pickScoreString(f?.scores) : null;
      }

      if (options?.include?.includes("odds")) {
        fixture.odds = buildOdds(f);
        console.log(fixture.odds);
      }

      if (options?.include?.includes("participants")) {
        const { homeId, awayId } = extractTeams(f.participants);
        fixture.homeTeamExternalId = homeId;
        fixture.awayTeamExternalId = awayId;
      }

      if (
        options?.include?.includes("stage") &&
        options?.include?.includes("round")
      ) {
        fixture.stageRoundName = `${f?.stage?.name} - ${f?.round?.name}`;
      }

      out.push(fixture);
    }
    return out;
  }

  /* ----------------------- Reference Data Methods ----------------------- */

  /**
   * Fetches all countries from SportMonks Core API
   * Countries are used to organize leagues and teams
   * @param options - Optional includes (leagues, etc.)
   * @returns CountryDTO[] with leagues included if requested
   */
  async fetchCountries(options?: {
    include?: IncludeNode[];
  }): Promise<(CountryDTO & { leagues?: Array<{ id: number }> })[]> {
    const rows = await this.httpCore.get<any>("countries", {
      select: ["id", "name", "image_path", "iso2", "iso3"],
      include: options?.include,
      perPage: 50,
      paginate: true,
    });

    return rows.map(
      (c: any): CountryDTO & { leagues?: Array<{ id: number }> } => ({
        externalId: c.id,
        name: c.name,
        imagePath: c.image_path ?? null,
        iso2: c.iso2 ?? null,
        iso3: c.iso3 ?? null,
        leagues: c.leagues, // Include leagues if present in response
      })
    );
  }

  /**
   * Fetches a single country by ID from SportMonks Core API
   * Uses the countries/{ID} endpoint
   * @param id - The SportMonks country ID
   * @param options - Optional includes (continent, leagues, regions)
   * @returns CountryDTO or null if not found
   */
  async fetchCountryById(
    id: number,
    options?: {
      include?: IncludeNode[];
      select?: string[];
    }
  ): Promise<CountryDTO | null> {
    try {
      const rows = await this.httpCore.get<any>(`countries/${id}`, {
        select: options?.select ?? ["id", "name", "image_path", "iso2", "iso3"],
        include: options?.include,
        paginate: false, // Single item, no pagination needed
      });

      if (!rows || rows.length === 0) {
        return null;
      }

      const c = rows[0];
      return {
        externalId: c.id,
        name: c.name,
        imagePath: c.image_path ?? null,
        iso2: c.iso2 ?? null,
        iso3: c.iso3 ?? null,
      };
    } catch (error) {
      // Return null if country not found or other error
      return null;
    }
  }

  /**
   * Fetches all leagues from SportMonks Football API
   * Leagues are the top-level competition structure
   * @param options - Optional includes (country, etc.)
   * @returns LeagueDTO[] with country included if requested (formatted)
   */
  async fetchLeagues(options?: { include?: IncludeNode[] }): Promise<
    (LeagueDTO & {
      country?: {
        id: number;
        name: string;
        imagePath: string | null;
        iso2: string | null;
        iso3: string | null;
      };
    })[]
  > {
    const rows = await this.httpFootball.get<any>("leagues", {
      select: [
        "id",
        "name",
        "image_path",
        "country_id",
        "short_code",
        "type",
        "sub_type",
      ],
      include: options?.include,
      perPage: 50,
      paginate: true,
    });

    return rows.map(
      (
        l: any
      ): LeagueDTO & {
        country?: {
          id: number;
          name: string;
          imagePath: string | null;
          iso2: string | null;
          iso3: string | null;
        };
      } => ({
        externalId: l.id,
        name: l.name,
        imagePath: l.image_path,
        shortCode: l.short_code,
        countryExternalId: l.country_id,
        type: l.type,
        subType: l.sub_type,
        country: l.country
          ? {
              id: l.country.id,
              name: l.country.name,
              imagePath: l.country.image_path ?? null,
              iso2: l.country.iso2 ?? null,
              iso3: l.country.iso3 ?? null,
            }
          : undefined,
      })
    );
  }

  /**
   * Fetches a single league by ID from SportMonks Football API
   * @param id - The SportMonks league ID
   * @returns LeagueDTO or null if not found
   */
  async fetchLeagueById(id: number): Promise<LeagueDTO | null> {
    try {
      const rows = await this.httpFootball.get<any>(`leagues/${id}`, {
        select: [
          "id",
          "name",
          "image_path",
          "country_id",
          "short_code",
          "type",
          "sub_type",
        ],
        include: [
          {
            name: "country",
            fields: ["id", "name", "image_path", "iso2", "iso3"],
          },
        ],
        paginate: false, // Single item, no pagination needed
      });

      if (!rows || rows.length === 0) {
        return null;
      }

      const l = rows[0];
      return {
        externalId: l.id,
        name: l.name,
        imagePath: l.image_path ?? null,
        shortCode: l.short_code ?? null,
        countryExternalId: l.country_id ?? null,
        type: l.type ?? null,
        subType: l.sub_type ?? null,
      };
    } catch (error) {
      // Return null if league not found or other error
      return null;
    }
  }

  /**
   * Fetches seasons from SportMonks Football API
   * Filters to only current and future seasons to avoid historical data
   */
  async fetchSeasons(): Promise<SeasonDTO[]> {
    const rows = await this.httpFootball.get<any>("seasons", {
      select: [
        "id",
        "league_id",
        "name",
        "starting_at",
        "ending_at",
        "is_current",
        "finished",
      ],
      include: [
        {
          name: "league",
          fields: ["id", "name"],
          include: [{ name: "country", fields: ["id", "name"] }],
        },
      ],
      perPage: 50,
      paginate: true,
    });

    // Filter to only current and future seasons
    return rows
      .filter((s: any) => !Boolean(s.finished))
      .map(
        (s: any): SeasonDTO => ({
          externalId: s.id,
          leagueExternalId: s.league_id ?? null,
          name: s.name,
          startDate: s.starting_at ?? null,
          endDate: s.ending_at ?? null,
          isCurrent: Boolean(s.is_current),
          leagueName: s.league?.name,
          countryName: s.league?.country?.name,
        })
      );
  }

  /**
   * Fetches a single season by ID from SportMonks Football API
   * @param id - The SportMonks season ID
   * @returns SeasonDTO or null if not found
   */
  async fetchSeasonById(id: number): Promise<SeasonDTO | null> {
    try {
      const rows = await this.httpFootball.get<any>(`seasons/${id}`, {
        select: [
          "id",
          "league_id",
          "name",
          "starting_at",
          "ending_at",
          "is_current",
          "finished",
        ],
        include: [
          {
            name: "league",
            fields: ["id", "name"],
            include: [{ name: "country", fields: ["id", "name"] }],
          },
        ],
        paginate: false,
      });

      if (!rows || rows.length === 0) {
        return null;
      }

      const s = rows[0];
      if (Boolean(s.finished)) {
        return null; // Skip finished seasons
      }

      return {
        externalId: s.id,
        leagueExternalId: s.league_id ?? null,
        name: s.name,
        startDate: s.starting_at ?? null,
        endDate: s.ending_at ?? null,
        isCurrent: Boolean(s.is_current),
        leagueName: s.league?.name,
        countryName: s.league?.country?.name,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Returns hardcoded bookmakers since SportMonks doesn't provide bookmaker data
   * Currently only bet365 is supported
   */
  async fetchBookmakers(): Promise<BookmakerDTO[]> {
    return [
      {
        externalId: 2,
        name: "bet365",
      },
    ];
  }

  /**
   * Fetches teams from SportMonks Football API
   * Filters out placeholder teams (like "Winner", "TBC", etc.)
   * that are used for tournament brackets but aren't real teams
   */
  private static PLACEHOLDER_IMG_FRAGMENT = "/team_placeholder.png";
  private static PLACEHOLDER_NAME_PATTERNS: RegExp[] = [
    /^(winner|loser)\b/i,
    /^(runner[-\s]?up)\b/i,
    /^winner match \d+/i,
    /^tbc$/i,
    /^\d+(st|nd|rd|th)\s+group\b/i,
    /^group\s+[A-Z]$/i,
    /^\d+(st|nd|rd|th)\s+group\s+[A-Z](\/[A-Z])*/i,
    /^3rd group [A-Z](\/[A-Z])*/i,
  ];

  /**
   * Determines if a team name/image looks like a placeholder
   * SportMonks uses placeholder teams for tournament brackets
   */
  private static looksLikePlaceholder(name: string, imagePath?: string | null) {
    if (!name) return true;
    for (const rx of SportMonksAdapter.PLACEHOLDER_NAME_PATTERNS) {
      if (rx.test(name)) return true;
    }
    if (
      imagePath &&
      imagePath.includes(SportMonksAdapter.PLACEHOLDER_IMG_FRAGMENT)
    ) {
      return true;
    }
    return false;
  }

  async fetchTeams(): Promise<TeamDTO[]> {
    const rows = await this.httpFootball.get<any>("teams", {
      select: [
        "id",
        "name",
        "short_code",
        "image_path",
        "country_id",
        "founded",
        "type",
      ],
      perPage: 50,
      paginate: true,
    });

    const teams: TeamDTO[] = [];

    for (const t of rows) {
      const name: string = t.name ?? "";
      const img: string | null = t.image_path ?? null;

      // Skip placeholder teams
      if (SportMonksAdapter.looksLikePlaceholder(name, img)) continue;

      const type: string | null =
        typeof t.type === "string" ? t.type.toLowerCase() : null;

      teams.push({
        externalId: t.id,
        name,
        shortCode: t.short_code ?? null,
        imagePath: img,
        countryExternalId: t.country_id ?? null,
        founded: Number.isInteger(t.founded) ? t.founded : null,
        type: type ?? null,
      });
    }

    return teams;
  }

  /**
   * Fetches a single team by ID from SportMonks Football API
   * @param id - The SportMonks team ID
   * @returns TeamDTO or null if not found
   */
  async fetchTeamById(id: number): Promise<TeamDTO | null> {
    try {
      const rows = await this.httpFootball.get<any>(`teams/${id}`, {
        select: [
          "id",
          "name",
          "short_code",
          "image_path",
          "country_id",
          "founded",
          "type",
        ],
        paginate: false, // Single item, no pagination needed
      });

      if (!rows || rows.length === 0) {
        return null;
      }

      const t = rows[0];
      const name: string = t.name ?? "";
      const img: string | null = t.image_path ?? null;

      // Skip placeholder teams
      if (SportMonksAdapter.looksLikePlaceholder(name, img)) {
        return null;
      }

      const type: string | null =
        typeof t.type === "string" ? t.type.toLowerCase() : null;

      return {
        externalId: t.id,
        name,
        shortCode: t.short_code ?? null,
        imagePath: img,
        countryExternalId: t.country_id ?? null,
        founded: Number.isInteger(t.founded) ? t.founded : null,
        type: type ?? null,
      };
    } catch (error) {
      // Return null if team not found or other error
      return null;
    }
  }
}

export default SportMonksAdapter;
