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
import type {
  FixtureFetchOptions,
  FixturesBySeasonOptions,
  OddsFetchOptions,
} from "../../adapter.interface";
import type { ISportsDataAdapter } from "../../adapter.interface";
import type { FixtureSportmonks } from "./sportmonks.types";
import { validateConfig } from "./sportmonks.config";
import type { SportMonksConfig } from "./sportmonks.config";
import { SportsDataError } from "../../errors";
import { Semaphore } from "../../semaphore";
import type { SportsDataLogger } from "../../logger";
import {
  SMHttp,
  IncludeNode,
  buildOdds,
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
export class SportMonksAdapter implements ISportsDataAdapter {
  private readonly config: SportMonksConfig;
  private httpFootball: SMHttp;
  private httpCore: SMHttp;
  private httpBase: SMHttp;
  private logger: SportsDataLogger;

  constructor(opts: Partial<SportMonksConfig> = {}) {
    this.config = validateConfig(opts);
    this.logger = this.config.logger;

    const { token, footballBaseUrl, coreBaseUrl, authMode } = this.config;

    // Shared semaphore — all HTTP instances share the same rate limit
    const semaphore = new Semaphore(this.config.maxConcurrency);

    const smHttpOptions = {
      logger: this.config.logger,
      defaultRetries: this.config.defaultRetries,
      defaultPerPage: this.config.defaultPerPage,
      retryDelayMs: this.config.retryDelayMs,
      semaphore,
    };

    this.httpFootball = new SMHttp(token, footballBaseUrl, authMode, smHttpOptions);
    this.httpCore = new SMHttp(token, coreBaseUrl, authMode, smHttpOptions);

    const baseV3Url = footballBaseUrl
      .replace(/\/football\/?$/, "")
      .replace(/\/core\/?$/, "");
    this.httpBase = new SMHttp(token, baseV3Url, authMode, smHttpOptions);
  }

  getStats(): {
    football: ReturnType<SMHttp["getStats"]>;
    core: ReturnType<SMHttp["getStats"]>;
    base: ReturnType<SMHttp["getStats"]>;
  } {
    return {
      football: this.httpFootball.getStats(),
      core: this.httpCore.getStats(),
      base: this.httpBase.getStats(),
    };
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

  /** Translates generic opts to SportMonks IncludeNode[]. Kept internal—not exposed in public API. */
  private buildFixtureInclude(opts?: FixtureFetchOptions): IncludeNode[] {
    const extra: IncludeNode[] = [];
    if (opts?.includeScores === true) extra.push("scores");
    if (opts?.includeOdds === true)
      extra.push({
        name: "odds",
        include: [{ name: "bookmaker" }, { name: "market" }],
      });
    return extra;
  }

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
    options: FixturesBySeasonOptions = {}
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesBySeason", { seasonExternalId });
    const baseFixturesInclude: IncludeNode[] = [
      { name: "state", fields: ["id", "short_name"] },
      { name: "participants", fields: ["id"] },
      { name: "round", fields: ["name"] },
      { name: "stage", fields: ["name"] },
      { name: "league", include: [{ name: "country" }] },
      ...this.buildFixtureInclude(options),
    ];
    const rows = await this.httpFootball.get<SmSeasonRaw>(
      `seasons/${seasonExternalId}`,
      {
        include: [{ name: "fixtures", include: baseFixturesInclude }],
        filters: options.fixtureStates
          ? { fixtureStates: options.fixtureStates }
          : undefined,
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
    options: FixtureFetchOptions = {}
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesBetween", { startIso, endIso });
    const encodedFrom = encodeURIComponent(startIso);
    const encodedTo = encodeURIComponent(endIso);
    const include = [...this.fixtureInclude, ...this.buildFixtureInclude(options)];

    const rows = await this.httpFootball.get<FixtureSportmonks>(
      `fixtures/between/${encodedFrom}/${encodedTo}`,
      {
        include,
        filters: options.filters,
        perPage: options.perPage ?? this.config.defaultPerPage,
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
    options: OddsFetchOptions = {}
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
        perPage: this.config.defaultPerPage,
        sortBy: "starting_at",
        order: "asc",
      }
    );

    const out: OddsDTO[] = [];
    for (const f of rows) {
      out.push(...buildOdds(f));
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
  async fetchLiveFixtures(options?: FixtureFetchOptions): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchLiveFixtures", {});
    const include = [
      ...this.fixtureInclude,
      ...this.buildFixtureInclude(options),
    ];
    const rows = await this.httpFootball.get<FixtureSportmonks>("livescores/inplay", {
      include,
      perPage: options?.perPage ?? this.config.defaultPerPage,
      filters: options?.filters,
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
        includeScores: true,
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
    options?: FixtureFetchOptions
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesByIds", {
      externalIdsCount: externalIds?.length ?? 0,
    });
    if (!externalIds?.length) {
      this.logger.info("fetchFixturesByIds", { count: 0 });
      return [];
    }

    const include = [
      ...this.fixtureInclude,
      ...this.buildFixtureInclude(options),
    ];
    const rows = await this.httpFootball.get<FixtureSportmonks>(
      `fixtures/multi/${externalIds.join(",")}`,
      {
        include,
        filters: options?.filters,
        perPage: options?.perPage,
      }
    );

    const out: FixtureDTO[] = [];
    for (const f of rows) {
      const fixture = buildFixtures(f);
      if (fixture) out.push(fixture);
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
   * @returns CountryDTO[]
   */
  async fetchCountries(): Promise<CountryDTO[]> {
    this.logger.info("fetchCountries", {});
    const rows = await this.httpCore.get<SmCountryRaw>("countries", {
      select: ["id", "name", "image_path", "iso2", "iso3"],
      perPage: this.config.defaultPerPage,
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
   * @returns CountryDTO or null if not found
   */
  async fetchCountryById(id: number): Promise<CountryDTO | null> {
    this.logger.info("fetchCountryById", { id });
    try {
      const rows = await this.httpCore.get<SmCountryRaw>(`countries/${id}`, {
        select: ["id", "name", "image_path", "iso2", "iso3"],
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
   * @returns LeagueDTO[]
   */
  async fetchLeagues(): Promise<LeagueDTO[]> {
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
      perPage: this.config.defaultPerPage,
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
      perPage: this.config.defaultPerPage,
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
      perPage: this.config.defaultPerPage,
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
      perPage: this.config.defaultPerPage,
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
      perPage: this.config.defaultPerPage,
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
