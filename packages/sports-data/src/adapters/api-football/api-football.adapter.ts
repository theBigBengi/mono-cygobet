import {
  FixtureState,
  type BookmakerDTO,
  type CountryDTO,
  type ExternalId,
  type FixtureDTO,
  type LeagueDTO,
  type MarketDTO,
  type OddsDTO,
  type SeasonDTO,
  type SeasonPreviewDTO,
  type StandingDTO,
  type TeamDTO,
} from "@repo/types/sport-data/common";
import type {
  FixtureFetchOptions,
  FixturesBySeasonOptions,
  OddsFetchOptions,
  ProviderCapabilities,
} from "../../adapter.interface";
import { BaseSportsDataAdapter } from "../../base-adapter";
import { Semaphore } from "../../semaphore";
import type { SportsDataLogger } from "../../logger";
import { validateConfig } from "./api-football.config";
import type { ApiFootballConfig } from "./api-football.config";
import type {
  AFBookmakerRaw,
  AFFixtureRaw,
  AFLeagueRaw,
  AFOddsRaw,
  AFStandingGroupRaw,
  AFTeamRaw,
  AFCountryRaw,
} from "./api-football.types";
import {
  AFHttp,
  buildFixture,
  buildOdds,
  buildStanding,
  composeSeasonId,
  parseSeasonId,
  statesToAfFilter,
} from "./helpers";

/**
 * API-Football (api-sports.io v3) adapter.
 * Implements ISportsDataAdapter for the API-Football data provider.
 */
export class ApiFootballAdapter extends BaseSportsDataAdapter {
  readonly capabilities: ProviderCapabilities = {
    odds: true,
    standings: true,
    dateRange: true,
    singleEntity: true,
  };

  private readonly config: ApiFootballConfig;
  private readonly http: AFHttp;
  private readonly logger: SportsDataLogger;

  constructor(opts: Partial<ApiFootballConfig> = {}) {
    super();
    this.config = validateConfig(opts);
    this.logger = this.config.logger;

    const semaphore = new Semaphore(this.config.maxConcurrency);

    this.http = new AFHttp(this.config.apiKey, this.config.baseUrl, {
      logger: this.config.logger,
      defaultRetries: this.config.defaultRetries,
      retryDelayMs: this.config.retryDelayMs,
      semaphore,
    });
  }

  getStats(): { http: ReturnType<AFHttp["getStats"]> } {
    return { http: this.http.getStats() };
  }

  /* ----------------------- Layer 1: Abstract methods ----------------------- */

  async fetchCountries(): Promise<CountryDTO[]> {
    this.logger.info("fetchCountries", {});
    const rows = await this.http.get<AFCountryRaw>("countries");

    const out = rows.map(
      (c): CountryDTO => ({
        // API-Football has no numeric country IDs — use ISO code
        externalId: c.code ?? c.name,
        name: c.name,
        imagePath: c.flag ?? null,
        iso2: c.code ?? null,
      })
    );
    this.logger.info("fetchCountries", { count: out.length });
    return out;
  }

  async fetchLeagues(): Promise<LeagueDTO[]> {
    this.logger.info("fetchLeagues", {});
    const rows = await this.http.get<AFLeagueRaw>("leagues");

    const out = rows.map(
      (l): LeagueDTO => ({
        externalId: l.league.id,
        name: l.league.name,
        imagePath: l.league.logo ?? null,
        shortCode: null,
        countryExternalId: l.country?.code ?? null,
        type: l.league.type ?? null,
        subType: null,
      })
    );
    this.logger.info("fetchLeagues", { count: out.length });
    return out;
  }

  async fetchSeasons(): Promise<SeasonDTO[]> {
    this.logger.info("fetchSeasons", {});
    const leagues = await this.http.get<AFLeagueRaw>("leagues");

    const out: SeasonDTO[] = [];
    for (const l of leagues) {
      for (const s of l.seasons ?? []) {
        // Only include current/not-finished seasons
        if (!s.current) continue;
        out.push({
          externalId: composeSeasonId(l.league.id, s.year),
          leagueExternalId: l.league.id,
          name: `${s.year}/${s.year + 1}`,
          startDate: s.start ?? "",
          endDate: s.end ?? "",
          isCurrent: s.current,
          leagueName: l.league.name,
          countryName: l.country?.name ?? "",
        });
      }
    }
    this.logger.info("fetchSeasons", { count: out.length });
    return out;
  }

  async fetchTeams(): Promise<TeamDTO[]> {
    this.logger.info("fetchTeams", {});
    this.logger.warn("fetchTeams: fetching all teams is expensive — requires one call per current season", {});

    const leagues = await this.http.get<AFLeagueRaw>("leagues");

    const seen = new Set<number>();
    const teams: TeamDTO[] = [];

    for (const l of leagues) {
      const currentSeason = l.seasons?.find((s) => s.current);
      if (!currentSeason) continue;

      const rows = await this.http.get<AFTeamRaw>("teams", {
        league: l.league.id,
        season: currentSeason.year,
      });

      for (const t of rows) {
        if (seen.has(t.team.id)) continue;
        seen.add(t.team.id);

        teams.push({
          externalId: t.team.id,
          name: t.team.name,
          shortCode: t.team.code ?? null,
          imagePath: t.team.logo ?? null,
          countryExternalId: null, // API-Football teams have country name, not ID
          founded: t.team.founded ?? null,
          type: t.team.national ? "national" : "club",
        });
      }
    }

    this.logger.info("fetchTeams", { count: teams.length });
    return teams;
  }

  async fetchFixturesBySeason(
    seasonExternalId: ExternalId,
    options: FixturesBySeasonOptions = {}
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesBySeason", { seasonExternalId });

    const { leagueId, year } = parseSeasonId(seasonExternalId);
    const params: Record<string, string | number | boolean | undefined> = {
      league: leagueId,
      season: year,
    };

    if (options.states?.length) {
      const statusFilter = statesToAfFilter(options.states);
      if (statusFilter) params.status = statusFilter;
    }

    const rows = await this.http.get<AFFixtureRaw>("fixtures", params);

    const out: FixtureDTO[] = [];
    for (const raw of rows) {
      out.push(buildFixture(raw));
    }

    this.logger.info("fetchFixturesBySeason", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return out;
  }

  async fetchLiveFixtures(
    options?: FixtureFetchOptions
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchLiveFixtures", {});

    const rows = await this.http.get<AFFixtureRaw>("fixtures", { live: "all" });

    let out = rows.map(buildFixture);

    // Client-side state filter if provided
    if (options?.states?.length) {
      const stateSet = new Set<string>(options.states);
      out = out.filter((f) => stateSet.has(f.state));
    }

    this.logger.info("fetchLiveFixtures", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return out;
  }

  /* ----------------------- Layer 2: Overrides ----------------------- */

  async fetchFixturesBetween(
    startIso: string,
    endIso: string,
    options: FixtureFetchOptions = {}
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesBetween", { startIso, endIso });

    // API-Football uses YYYY-MM-DD for date params
    const from = startIso.slice(0, 10);
    const to = endIso.slice(0, 10);

    const params: Record<string, string | number | boolean | undefined> = {
      from,
      to,
    };

    if (options.states?.length) {
      const statusFilter = statesToAfFilter(options.states);
      if (statusFilter) params.status = statusFilter;
    }

    const rows = await this.http.get<AFFixtureRaw>("fixtures", params);
    const out = rows.map(buildFixture);

    this.logger.info("fetchFixturesBetween", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return out;
  }

  async fetchFixturesByIds(
    externalIds: ExternalId[],
    _options?: FixtureFetchOptions
  ): Promise<FixtureDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchFixturesByIds", {
      externalIdsCount: externalIds?.length ?? 0,
    });
    if (!externalIds?.length) {
      this.logger.info("fetchFixturesByIds", { count: 0 });
      return [];
    }

    // API-Football: ?ids=1-2-3 (max 20, dash-separated)
    const CHUNK_SIZE = 20;
    const out: FixtureDTO[] = [];

    for (let i = 0; i < externalIds.length; i += CHUNK_SIZE) {
      const chunk = externalIds.slice(i, i + CHUNK_SIZE);
      const ids = chunk.join("-");
      const rows = await this.http.get<AFFixtureRaw>("fixtures", { ids });
      for (const raw of rows) {
        out.push(buildFixture(raw));
      }
    }

    this.logger.info("fetchFixturesByIds", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return out;
  }

  async fetchFixtureById(id: ExternalId): Promise<FixtureDTO | null> {
    const startMs = performance.now();
    this.logger.info("fetchFixtureById", { id });

    const rows = await this.http.get<AFFixtureRaw>("fixtures", { id });
    const result = rows.length > 0 ? buildFixture(rows[0]!) : null;

    this.logger.info("fetchFixtureById", {
      count: result ? 1 : 0,
      durationMs: Math.round(performance.now() - startMs),
    });
    return result;
  }

  async fetchTeamsBySeason(
    seasonExternalId: ExternalId
  ): Promise<TeamDTO[]> {
    this.logger.info("fetchTeamsBySeason", { seasonExternalId });
    const { leagueId, year } = parseSeasonId(seasonExternalId);

    const rows = await this.http.get<AFTeamRaw>("teams", {
      league: leagueId,
      season: year,
    });

    const teams: TeamDTO[] = rows.map((t) => ({
      externalId: t.team.id,
      name: t.team.name,
      shortCode: t.team.code ?? null,
      imagePath: t.team.logo ?? null,
      countryExternalId: null,
      founded: t.team.founded ?? null,
      type: t.team.national ? "national" : "club",
    }));

    this.logger.info("fetchTeamsBySeason", {
      seasonExternalId,
      count: teams.length,
    });
    return teams;
  }

  async fetchStandingsBySeason(
    seasonExternalId: ExternalId
  ): Promise<StandingDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchStandingsBySeason", { seasonExternalId });

    const { leagueId, year } = parseSeasonId(seasonExternalId);

    const rows = await this.http.get<AFStandingGroupRaw>("standings", {
      league: leagueId,
      season: year,
    });

    // API-Football wraps standings in league.standings[][] (groups)
    const standings: StandingDTO[] = [];
    for (const group of rows) {
      for (const table of group.league?.standings ?? []) {
        for (const row of table) {
          standings.push(buildStanding(row, leagueId, year));
        }
      }
    }

    standings.sort((a, b) => a.position - b.position);

    this.logger.info("fetchStandingsBySeason", {
      seasonExternalId,
      count: standings.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return standings;
  }

  async fetchOddsBetween(
    startIso: string,
    endIso: string,
    _options?: OddsFetchOptions
  ): Promise<OddsDTO[]> {
    const startMs = performance.now();
    this.logger.info("fetchOddsBetween", { startIso, endIso });

    // API-Football odds endpoint is date-based (single day), so iterate per day
    const out: OddsDTO[] = [];
    const start = new Date(startIso);
    const end = new Date(endIso);

    for (
      let d = new Date(start);
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const dateStr = d.toISOString().slice(0, 10);
      const rows = await this.http.get<AFOddsRaw>("odds", { date: dateStr });
      for (const raw of rows) {
        out.push(...buildOdds(raw));
      }
    }

    this.logger.info("fetchOddsBetween", {
      count: out.length,
      durationMs: Math.round(performance.now() - startMs),
    });
    return out;
  }

  async fetchBookmakers(): Promise<BookmakerDTO[]> {
    this.logger.info("fetchBookmakers", {});
    const rows = await this.http.get<AFBookmakerRaw>("odds/bookmakers");

    const out = rows.map(
      (b): BookmakerDTO => ({
        externalId: b.id,
        name: b.name,
      })
    );
    this.logger.info("fetchBookmakers", { count: out.length });
    return out;
  }

  async fetchMarkets(): Promise<MarketDTO[]> {
    // API-Football has no dedicated markets endpoint
    return [];
  }

  async fetchAllSeasons(): Promise<SeasonDTO[]> {
    this.logger.info("fetchAllSeasons", {});
    const leagues = await this.http.get<AFLeagueRaw>("leagues");

    const out: SeasonDTO[] = [];
    for (const l of leagues) {
      for (const s of l.seasons ?? []) {
        out.push({
          externalId: composeSeasonId(l.league.id, s.year),
          leagueExternalId: l.league.id,
          name: `${s.year}/${s.year + 1}`,
          startDate: s.start ?? "",
          endDate: s.end ?? "",
          isCurrent: s.current,
          leagueName: l.league.name,
          countryName: l.country?.name ?? "",
        });
      }
    }
    this.logger.info("fetchAllSeasons", { count: out.length });
    return out;
  }

  async fetchSeasonPreview(
    seasonExternalId: ExternalId
  ): Promise<SeasonPreviewDTO | null> {
    const startMs = performance.now();
    this.logger.info("fetchSeasonPreview", { seasonExternalId });

    const { leagueId, year } = parseSeasonId(seasonExternalId);

    // Fetch league info, teams, and fixture count in parallel
    const [leagues, teams, fixtures] = await Promise.all([
      this.http.get<AFLeagueRaw>("leagues", { id: leagueId }),
      this.http.get<AFTeamRaw>("teams", {
        league: leagueId,
        season: year,
      }),
      this.http.get<AFFixtureRaw>("fixtures", {
        league: leagueId,
        season: year,
      }),
    ]);

    const league = leagues[0];
    if (!league) {
      this.logger.info("fetchSeasonPreview", { count: 0 });
      return null;
    }

    const now = new Date();
    const futureFixtures = fixtures.filter((f) => {
      if (!f.fixture?.date) return false;
      return new Date(f.fixture.date) > now;
    });

    const result: SeasonPreviewDTO = {
      season: {
        externalId: composeSeasonId(leagueId, year),
        name: `${year}/${year + 1}`,
      },
      league: {
        externalId: league.league.id,
        name: league.league.name,
      },
      country: {
        externalId: league.country?.code ?? league.country?.name ?? "",
        name: league.country?.name ?? "Unknown",
      },
      teamsCount: teams.length,
      fixturesCount: fixtures.length,
      fixturesCountFuture: futureFixtures.length,
    };

    this.logger.info("fetchSeasonPreview", {
      seasonExternalId,
      teamsCount: result.teamsCount,
      fixturesCount: result.fixturesCount,
      fixturesCountFuture: result.fixturesCountFuture,
      durationMs: Math.round(performance.now() - startMs),
    });
    return result;
  }

  async fetchFixturesByLeague(
    leagueId: ExternalId
  ): Promise<FixtureDTO[]> {
    this.logger.info("fetchFixturesByLeague", { leagueId });
    const currentYear = new Date().getFullYear();

    const rows = await this.http.get<AFFixtureRaw>("fixtures", {
      league: leagueId,
      season: currentYear,
    });

    const out = rows.map(buildFixture);
    this.logger.info("fetchFixturesByLeague", { count: out.length });
    return out;
  }

  async fetchTeamsByLeague(leagueId: ExternalId): Promise<TeamDTO[]> {
    this.logger.info("fetchTeamsByLeague", { leagueId });
    const currentYear = new Date().getFullYear();

    const rows = await this.http.get<AFTeamRaw>("teams", {
      league: leagueId,
      season: currentYear,
    });

    const teams: TeamDTO[] = rows.map((t) => ({
      externalId: t.team.id,
      name: t.team.name,
      shortCode: t.team.code ?? null,
      imagePath: t.team.logo ?? null,
      countryExternalId: null,
      founded: t.team.founded ?? null,
      type: t.team.national ? "national" : "club",
    }));

    this.logger.info("fetchTeamsByLeague", { count: teams.length });
    return teams;
  }

  async fetchStandingsByLeague(
    leagueId: ExternalId
  ): Promise<StandingDTO[]> {
    this.logger.info("fetchStandingsByLeague", { leagueId });
    const currentYear = new Date().getFullYear();

    const rows = await this.http.get<AFStandingGroupRaw>("standings", {
      league: leagueId,
      season: currentYear,
    });

    const standings: StandingDTO[] = [];
    for (const group of rows) {
      for (const table of group.league?.standings ?? []) {
        for (const row of table) {
          standings.push(
            buildStanding(row, Number(leagueId), currentYear)
          );
        }
      }
    }

    standings.sort((a, b) => a.position - b.position);
    this.logger.info("fetchStandingsByLeague", { count: standings.length });
    return standings;
  }
}
