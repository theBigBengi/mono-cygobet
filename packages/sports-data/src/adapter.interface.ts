/**
 * Provider-agnostic interface for sports data adapters.
 * Represents what consumers need--not how any specific provider works.
 */

import type {
  BookmakerDTO,
  CountryDTO,
  ExternalId,
  FixtureDTO,
  FixtureState,
  LeagueDTO,
  MarketDTO,
  OddsDTO,
  SeasonDTO,
  SeasonPreviewDTO,
  StandingDTO,
  TeamDTO,
} from "@repo/types/sport-data/common";

/** Fixture fetch options--provider-agnostic. */
export type FixtureFetchOptions = {
  includeScores?: boolean;
  includeOdds?: boolean;
  perPage?: number;
  states?: FixtureState[];
};

/** fetchFixturesBySeason has an additional option */
export type FixturesBySeasonOptions = {
  includeScores?: boolean;
  includeOdds?: boolean;
  states?: FixtureState[];
};

/** Options for fetchOddsBetween */
export type OddsFetchOptions = {
  bookmakerIds?: ExternalId[];
  marketIds?: ExternalId[];
  fixtureIds?: ExternalId[];
  perPage?: number;
};

/** Provider capabilities for admin UI hints. NOT for logic — methods always work. */
export type ProviderCapabilities = {
  odds: boolean;
  standings: boolean;
  dateRange: boolean;
  singleEntity: boolean;
};

export interface ISportsDataAdapter {
  /** Provider capabilities for admin UI hints. */
  readonly capabilities: ProviderCapabilities;

  // ── Core data (every adapter implements from scratch) ──

  fetchCountries(): Promise<CountryDTO[]>;
  fetchLeagues(): Promise<LeagueDTO[]>;
  fetchSeasons(): Promise<SeasonDTO[]>;
  fetchTeams(): Promise<TeamDTO[]>;
  fetchFixturesBySeason(
    seasonId: ExternalId,
    opts?: FixturesBySeasonOptions
  ): Promise<FixtureDTO[]>;
  fetchLiveFixtures(opts?: FixtureFetchOptions): Promise<FixtureDTO[]>;

  // ── Single-entity lookups (base class provides fallbacks) ──

  fetchCountryById(id: ExternalId): Promise<CountryDTO | null>;
  fetchLeagueById(id: ExternalId): Promise<LeagueDTO | null>;
  fetchSeasonById(id: ExternalId): Promise<SeasonDTO | null>;
  fetchTeamById(id: ExternalId): Promise<TeamDTO | null>;
  fetchFixtureById(id: ExternalId): Promise<FixtureDTO | null>;

  // ── Fixture batch lookups (base class provides fallbacks) ──

  fetchFixturesBetween(
    startIso: string,
    endIso: string,
    opts?: FixtureFetchOptions
  ): Promise<FixtureDTO[]>;
  fetchFixturesByIds(
    ids: ExternalId[],
    opts?: FixtureFetchOptions
  ): Promise<FixtureDTO[]>;

  // ── League-centric methods (for league-based providers) ──

  fetchFixturesByLeague(leagueId: ExternalId): Promise<FixtureDTO[]>;
  fetchTeamsByLeague(leagueId: ExternalId): Promise<TeamDTO[]>;
  fetchStandingsByLeague(leagueId: ExternalId): Promise<StandingDTO[]>;

  // ── Season-based secondary data ──

  fetchTeamsBySeason(seasonId: ExternalId): Promise<TeamDTO[]>;
  fetchStandingsBySeason(seasonId: ExternalId): Promise<StandingDTO[]>;
  fetchAllSeasons(): Promise<SeasonDTO[]>;
  fetchSeasonPreview(seasonId: ExternalId): Promise<SeasonPreviewDTO | null>;

  // ── Odds ──

  fetchOddsBetween(
    startIso: string,
    endIso: string,
    opts?: OddsFetchOptions
  ): Promise<OddsDTO[]>;
  fetchBookmakers(): Promise<BookmakerDTO[]>;
  fetchMarkets(): Promise<MarketDTO[]>;

  // ── Observability ──

  getStats(): Record<string, unknown>;
}
