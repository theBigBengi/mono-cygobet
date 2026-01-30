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
  MarketDTO,
  OddsDTO,
  FixtureDTO,
  FixtureState,
  LeagueDTO,
  SeasonDTO,
  TeamDTO,
} from "@repo/types/sport-data/common";
import type { FixtureSportmonks } from "./sportmonks.types";
import { SportsDataError } from "../../errors";
import { noopLogger } from "../../logger";
import type { SportsDataLogger } from "../../logger";
import {
  SMHttp,
  IncludeNode,
  mapSmShortToApp,
  pickScoreString,
  extractTeams,
  buildOdds,
  coerceEpochSeconds,
  buildFixtures,
} from "./helpers";
import type {
  SmCountryRaw,
  SmLeagueRaw,
  SmSeasonRaw,
  SmBookmakerRaw,
  SmMarketRaw,
  SmTeamRaw,
} from "./sportmonks.types";

/* ----------------------- SportMonksAdapter Implementation ----------------------- */

/**
 * Main adapter class that implements SportsDataAdapter interface
 * Provides unified access to SportMonks football and core APIs
 */
export class SportMonksAdapter {
  private httpFootball: SMHttp;
  private httpCore: SMHttp;
  private httpBase: SMHttp;
  private logger: SportsDataLogger;

  constructor(
    opts: {
      token?: string;
      footballBaseUrl?: string;
      coreBaseUrl?: string;
      authMode?: "query" | "header";
      logger?: SportsDataLogger;
    } = {}
  ) {
    const token = opts.token ?? process.env.SPORTMONKS_API_TOKEN;
    if (!token) throw new SportsDataError("UNKNOWN", "API token is required");

    const authMode =
      opts.authMode ?? (process.env.SPORTMONKS_AUTH_MODE as "query" | "header");
    if (!authMode) throw new SportsDataError("UNKNOWN", "Auth mode is required");

    const footballBaseUrl =
      opts.footballBaseUrl ?? process.env.SPORTMONKS_FOOTBALL_BASE_URL;
    if (!footballBaseUrl)
      throw new SportsDataError("UNKNOWN", "Football base URL is required");
    const coreBaseUrl =
      opts.coreBaseUrl ?? process.env.SPORTMONKS_CORE_BASE_URL;
    if (!coreBaseUrl) throw new SportsDataError("UNKNOWN", "Core base URL is required");

    this.logger = opts.logger ?? noopLogger;

    // Initialize HTTP clients for both APIs
    this.httpFootball = new SMHttp(token, footballBaseUrl, authMode, this.logger);
    this.httpCore = new SMHttp(token, coreBaseUrl, authMode, this.logger);

    // Base v3 URL (strip /football/ or /core/ from the base URL)
    const baseV3Url = footballBaseUrl
      .replace(/\/football\/?$/, "")
      .replace(/\/core\/?$/, "");
    this.httpBase = new SMHttp(token, baseV3Url, authMode, this.logger);
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
    const startMs = performance.now();
    this.logger.info("fetchFixturesBySeason", { seasonExternalId });
    const rows = await this.httpFootball.get<SmSeasonRaw>(
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
        filters: options.fixtureStates
          ? {
              fixtureStates: options.fixtureStates,
            }
          : undefined, // No filter = fetch all fixture states
      }
    );

    const out: FixtureDTO[] = [];
    for (const r of rows) {
      const fixtures = r.fixtures ?? [];
      for (const f of fixtures) {
        const fixture = buildFixtures(f);
        if (fixture) {
          out.push(fixture);
        }
      }
    }
    this.logger.info("fetchFixturesBySeason", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
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
      sortBy?: string;
      order?: "asc" | "desc";
      filters?: string | Record<string, string | number | boolean>;
    } = {}
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesBetween", { startIso, endIso });
    const encodedFrom = encodeURIComponent(startIso);
    const encodedTo = encodeURIComponent(endIso);

    const rows = await this.httpFootball.get<FixtureSportmonks>(
      `fixtures/between/${encodedFrom}/${encodedTo}`,
      {
        include: [...this.fixtureInclude, ...(options.include ?? [])],
        filters: options.filters,
        perPage: options.perPage ?? 50,
        sortBy: options.sortBy ?? "starting_at",
        order: options.order ?? "asc",
      }
    );

    const out: FixtureDTO[] = [];

    for (const f of rows) {
      const fixture = buildFixtures(f);
      if (fixture) {
        out.push(fixture);
      }
    }

    this.logger.info("fetchFixturesBetween", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
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
    const startMs = performance.now();
    this.logger.info("fetchOddsBetween", { startIso, endIso });
    const encodedFrom = encodeURIComponent(startIso);
    const encodedTo = encodeURIComponent(endIso);

    const rows = await this.httpFootball.get<FixtureSportmonks>(
      `fixtures/between/${encodedFrom}/${encodedTo}`,
      {
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
    this.logger.info("fetchOddsBetween", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
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
    const startMs = performance.now();
    this.logger.info("fetchLiveFixtures", {});
    const rows = await this.httpFootball.get<FixtureSportmonks>("livescores/inplay", {
      include: [...this.fixtureInclude, ...(options?.include ?? [])],
      perPage: options?.perPage ?? 50,
    });

    const out: FixtureDTO[] = [];

    for (const f of rows) {
      const fixture = buildFixtures(f);
      if (fixture) {
        out.push(fixture);
      }
    }

    this.logger.info("fetchLiveFixtures", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
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
   *   // use fixture.name, fixture.state
   * }
   * ```
   */
  async fetchFixtureById(id: number): Promise<FixtureDTO | null> {
    const startMs = performance.now();
    this.logger.info("fetchFixtureById", { id });
    try {
      const fixtures = await this.fetchFixturesByIds([id], {
        include: [
          {
            name: "participants",
          },
          {
            name: "state",
            fields: ["id", "short_name"],
          },
          {
            name: "league",
            include: [{ name: "country" }],
          },
          {
            name: "round",
            fields: ["name"],
          },
          {
            name: "stage",
            fields: ["name"],
          },
          "scores",
        ],
      });

      const result = fixtures.length > 0 ? (fixtures[0] ?? null) : null;
      this.logger.info("fetchFixtureById", {
        count: result ? 1 : 0,
        durationMs: Math.round(performance.now() - startMs),
      });
      return result;
    } catch (error) {
      const code =
        error instanceof SportsDataError ? error.code : undefined;
      this.logger.error("fetchFixtureById", { code });
      if (
        error instanceof SportsDataError &&
        error.statusCode === 404
      ) {
        return null;
      }
      throw error;
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
    const startMs = performance.now();
    this.logger.info("fetchFixturesByIds", {
      externalIdsCount: externalIds?.length ?? 0,
    });
    if (!externalIds?.length) {
      this.logger.info("fetchFixturesByIds", { count: 0 });
      return [];
    }

    const rows = await this.httpFootball.get<FixtureSportmonks>(
      `fixtures/multi/${externalIds.join(",")}`,
      options
    );

    const out: FixtureDTO[] = [];
    for (const f of rows) {
      const { homeId, awayId } = extractTeams(f.participants);
      const hasStageRound =
        options?.include?.includes("stage") &&
        options?.include?.includes("round");
      const fixture: FixtureDTO = {
        externalId: Number(f.id),
        name: String(f.name ?? ""),
        leagueExternalId: Number.isFinite(f.league_id)
          ? Number(f.league_id)
          : null,
        seasonExternalId: Number.isFinite(f.season_id)
          ? Number(f.season_id)
          : null,
        homeTeamExternalId: homeId ?? 0,
        awayTeamExternalId: awayId ?? 0,
        startIso: f.starting_at ?? "",
        startTs: coerceEpochSeconds(f.starting_at_timestamp, f.starting_at),
        state: mapSmShortToApp(f?.state?.short_name) as FixtureState,
        result:
          options?.include?.includes("scores") && f.state?.short_name === "FT"
            ? pickScoreString(f?.scores)
            : null,
        stage: hasStageRound ? (f?.stage?.name ?? null) : null,
        round: hasStageRound ? (f?.round?.name ?? null) : null,
        hasOdds: f.has_odds ?? false,
        leagueName: f.league?.name ?? "",
        countryName: f.league?.country?.name ?? "",
      };
      out.push(fixture);
    }
    this.logger.info("fetchFixturesByIds", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return out;
  }

  /* ----------------------- Reference Data Methods ----------------------- */

  /**
   * Fetches all countries from SportMonks Core API
   * Countries are used to organize leagues and teams
   * @param options - Optional includes (leagues, etc.)
   * @returns CountryDTO[]
   */
  async fetchCountries(options?: {
    include?: IncludeNode[];
  }): Promise<CountryDTO[]> {
    this.logger.info("fetchCountries", {});
    const rows = await this.httpCore.get<SmCountryRaw>("countries", {
      select: ["id", "name", "image_path", "iso2", "iso3"],
      include: options?.include,
      perPage: 50,
      paginate: true,
    });

    const out = rows.map((c: SmCountryRaw): CountryDTO => ({
      externalId: c.id,
      name: c.name,
      imagePath: c.image_path ?? null,
      iso2: c.iso2 ?? null,
      iso3: c.iso3 ?? null,
    }));
    this.logger.info("fetchCountries", { count: out.length });
    return out;
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
    this.logger.info("fetchCountryById", { id });
    try {
      const rows = await this.httpCore.get<SmCountryRaw>(`countries/${id}`, {
        select: options?.select ?? ["id", "name", "image_path", "iso2", "iso3"],
        include: options?.include,
        paginate: false,
      });

      if (!rows || rows.length === 0) {
        this.logger.info("fetchCountryById", { count: 0 });
        return null;
      }

      const c = rows[0]!;
      const result = {
        externalId: c.id,
        name: c.name,
        imagePath: c.image_path ?? null,
        iso2: c.iso2 ?? null,
        iso3: c.iso3 ?? null,
      };
      this.logger.info("fetchCountryById", { count: 1 });
      return result;
    } catch (error) {
      const code =
        error instanceof SportsDataError ? error.code : undefined;
      this.logger.error("fetchCountryById", { code });
      if (
        error instanceof SportsDataError &&
        error.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetches all leagues from SportMonks Football API
   * Leagues are the top-level competition structure
   * @param options - Optional includes (country, etc.)
   * @returns LeagueDTO[]
   */
  async fetchLeagues(options?: {
    include?: IncludeNode[];
  }): Promise<LeagueDTO[]> {
    this.logger.info("fetchLeagues", {});
    const rows = await this.httpFootball.get<SmLeagueRaw>("leagues", {
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

    const out = rows.map((l: SmLeagueRaw): LeagueDTO => ({
      externalId: l.id,
      name: l.name,
      imagePath: l.image_path ?? null,
      shortCode: l.short_code ?? null,
      countryExternalId: l.country_id ?? null,
      type: l.type ?? null,
      subType: l.sub_type ?? null,
    }));
    this.logger.info("fetchLeagues", { count: out.length });
    return out;
  }

  /**
   * Fetches a single league by ID from SportMonks Football API
   * @param id - The SportMonks league ID
   * @returns LeagueDTO or null if not found
   */
  async fetchLeagueById(id: number): Promise<LeagueDTO | null> {
    this.logger.info("fetchLeagueById", { id });
    try {
      const rows = await this.httpFootball.get<SmLeagueRaw>(`leagues/${id}`, {
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
        paginate: false,
      });

      if (!rows || rows.length === 0) {
        this.logger.info("fetchLeagueById", { count: 0 });
        return null;
      }

      const l = rows[0]!;
      const result = {
        externalId: l.id,
        name: l.name,
        imagePath: l.image_path ?? null,
        shortCode: l.short_code ?? null,
        countryExternalId: l.country_id ?? null,
        type: l.type ?? null,
        subType: l.sub_type ?? null,
      };
      this.logger.info("fetchLeagueById", { count: 1 });
      return result;
    } catch (error) {
      const code =
        error instanceof SportsDataError ? error.code : undefined;
      this.logger.error("fetchLeagueById", { code });
      if (
        error instanceof SportsDataError &&
        error.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetches seasons from SportMonks Football API
   * Filters to only current and future seasons to avoid historical data
   */
  async fetchSeasons(): Promise<SeasonDTO[]> {
    this.logger.info("fetchSeasons", {});
    const rows = await this.httpFootball.get<SmSeasonRaw>("seasons", {
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

    const out = rows
      .filter((s: SmSeasonRaw) => !Boolean(s.finished))
      .map((s: SmSeasonRaw): SeasonDTO => ({
        externalId: s.id,
        leagueExternalId: s.league_id ?? 0,
        name: s.name ?? "",
        startDate: s.starting_at ?? "",
        endDate: s.ending_at ?? "",
        isCurrent: Boolean(s.is_current),
        leagueName: s.league?.name ?? "",
        countryName: s.league?.country?.name ?? "",
      }));
    this.logger.info("fetchSeasons", { count: out.length });
    return out;
  }

  /**
   * Fetches a single season by ID from SportMonks Football API
   * @param id - The SportMonks season ID
   * @returns SeasonDTO or null if not found
   */
  async fetchSeasonById(id: number): Promise<SeasonDTO | null> {
    this.logger.info("fetchSeasonById", { id });
    try {
      const rows = await this.httpFootball.get<SmSeasonRaw>(`seasons/${id}`, {
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
        this.logger.info("fetchSeasonById", { count: 0 });
        return null;
      }

      const s = rows[0]!;
      if (Boolean(s.finished)) {
        this.logger.info("fetchSeasonById", { count: 0 });
        return null;
      }

      const result = {
        externalId: s.id,
        leagueExternalId: s.league_id ?? 0,
        name: s.name ?? "",
        startDate: s.starting_at ?? "",
        endDate: s.ending_at ?? "",
        isCurrent: Boolean(s.is_current),
        leagueName: s.league?.name ?? "",
        countryName: s.league?.country?.name ?? "",
      };
      this.logger.info("fetchSeasonById", { count: 1 });
      return result;
    } catch (error) {
      const code =
        error instanceof SportsDataError ? error.code : undefined;
      this.logger.error("fetchSeasonById", { code });
      if (
        error instanceof SportsDataError &&
        error.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetches all bookmakers from SportMonks API.
   * Uses the /odds/bookmakers endpoint (v3 level, not under /football/ or /core/).
   *
   * Docs: https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/bookmakers/get-all-bookmakers
   */
  async fetchBookmakers(): Promise<BookmakerDTO[]> {
    this.logger.info("fetchBookmakers", {});
    const rows = await this.httpBase.get<SmBookmakerRaw>("odds/bookmakers", {
      perPage: 50,
      paginate: true,
    });

    const out = rows.map(
      (b: SmBookmakerRaw): BookmakerDTO => ({
        externalId: b.id,
        name: b.name,
      })
    );
    this.logger.info("fetchBookmakers", { count: out.length });
    return out;
  }

  /**
   * Fetches all markets from SportMonks API
   * Markets define the types of betting markets available (e.g., "Match Winner", "Over/Under")
   * Uses the /odds/markets endpoint (v3 level, not under /football/ or /core/)
   * @returns MarketDTO[] with all available markets
   */
  async fetchMarkets(): Promise<MarketDTO[]> {
    this.logger.info("fetchMarkets", {});
    const rows = await this.httpBase.get<SmMarketRaw>("odds/markets", {
      perPage: 50,
      paginate: true,
    });

    const out = rows.map(
      (m: SmMarketRaw): MarketDTO => ({
        externalId: m.id,
        name: m.name,
        description: m.description ?? null,
        developerName: m.developer_name ?? null,
      })
    );
    this.logger.info("fetchMarkets", { count: out.length });
    return out;
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
    this.logger.info("fetchTeams", {});
    const rows = await this.httpFootball.get<SmTeamRaw>("teams", {
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

    this.logger.info("fetchTeams", { count: teams.length });
    return teams;
  }

  /**
   * Fetches a single team by ID from SportMonks Football API
   * @param id - The SportMonks team ID
   * @returns TeamDTO or null if not found
   */
  async fetchTeamById(id: number): Promise<TeamDTO | null> {
    this.logger.info("fetchTeamById", { id });
    try {
      const rows = await this.httpFootball.get<SmTeamRaw>(`teams/${id}`, {
        select: [
          "id",
          "name",
          "short_code",
          "image_path",
          "country_id",
          "founded",
          "type",
        ],
        paginate: false,
      });

      if (!rows || rows.length === 0) {
        this.logger.info("fetchTeamById", { count: 0 });
        return null;
      }

      const t = rows[0]!;
      const name: string = t.name ?? "";
      const img: string | null = t.image_path ?? null;

      if (SportMonksAdapter.looksLikePlaceholder(name, img)) {
        this.logger.info("fetchTeamById", { count: 0 });
        return null;
      }

      const type: string | null =
        typeof t.type === "string" ? t.type.toLowerCase() : null;

      const result = {
        externalId: t.id,
        name,
        shortCode: t.short_code ?? null,
        imagePath: img,
        countryExternalId: t.country_id ?? null,
        founded: Number.isInteger(t.founded) ? t.founded : null,
        type: type ?? null,
      };
      this.logger.info("fetchTeamById", { count: 1 });
      return result;
    } catch (error) {
      const code =
        error instanceof SportsDataError ? error.code : undefined;
      this.logger.error("fetchTeamById", { code });
      if (
        error instanceof SportsDataError &&
        error.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }
}

export default SportMonksAdapter;
