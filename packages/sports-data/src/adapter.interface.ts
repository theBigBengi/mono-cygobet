/**
 * Provider-agnostic interface for sports data adapters.
 * Represents what consumers need—not how any specific provider works.
 */

import type {
  BookmakerDTO,
  CountryDTO,
  FixtureDTO,
  LeagueDTO,
  MarketDTO,
  OddsDTO,
  SeasonDTO,
  SeasonPreviewDTO,
  TeamDTO,
} from "@repo/types/sport-data/common";

/** Fixture fetch options—provider-agnostic. No include, IncludeNode, or provider-specific concepts. */
export type FixtureFetchOptions = {
  includeScores?: boolean;
  includeOdds?: boolean;
  filters?: Record<string, string | number | boolean>;
  perPage?: number;
  sortBy?: string;
  order?: "asc" | "desc";
};

/** fetchFixturesBySeason has an additional option */
export type FixturesBySeasonOptions = FixtureFetchOptions & {
  fixtureStates?: string;
};

/** Options for fetchOddsBetween */
export type OddsFetchOptions = {
  filters?: string | Record<string, string | number | boolean>;
};

export interface ISportsDataAdapter {
  // Fixtures
  fetchFixturesBetween(
    startIso: string,
    endIso: string,
    opts?: FixtureFetchOptions
  ): Promise<FixtureDTO[]>;
  fetchFixturesByIds(
    ids: number[],
    opts?: FixtureFetchOptions
  ): Promise<FixtureDTO[]>;
  fetchLiveFixtures(opts?: FixtureFetchOptions): Promise<FixtureDTO[]>;
  fetchFixtureById(id: number): Promise<FixtureDTO | null>;
  fetchFixturesBySeason(
    seasonId: number,
    opts?: FixturesBySeasonOptions
  ): Promise<FixtureDTO[]>;

  // Odds
  fetchOddsBetween(
    startIso: string,
    endIso: string,
    opts?: OddsFetchOptions
  ): Promise<OddsDTO[]>;
  fetchBookmakers(): Promise<BookmakerDTO[]>;
  fetchMarkets(): Promise<MarketDTO[]>;

  // Reference Data
  fetchCountries(): Promise<CountryDTO[]>;
  fetchCountryById(id: number): Promise<CountryDTO | null>;
  fetchLeagues(): Promise<LeagueDTO[]>;
  fetchLeagueById(id: number): Promise<LeagueDTO | null>;
  fetchSeasons(): Promise<SeasonDTO[]>;
  fetchSeasonById(id: number): Promise<SeasonDTO | null>;
  /** All seasons from provider (no finished filter). For availability comparison. */
  fetchAllSeasons?(): Promise<SeasonDTO[]>;
  /** Search seasons by name (e.g. "2026/2027" or numeric id string). */
  searchSeasons?(name: string): Promise<SeasonDTO[]>;
  fetchTeams(): Promise<TeamDTO[]>;
  fetchTeamById(id: number): Promise<TeamDTO | null>;
  /** All teams for a specific season. */
  fetchTeamsBySeason?(seasonExternalId: number): Promise<TeamDTO[]>;

  /** Returns health/stats for observability (circuit breaker state, semaphore depth, etc.) */
  getStats?(): Record<string, unknown>;

  /**
   * Fetches season preview data for seeding dialog.
   * Optimized to fetch season + league + country + teams count + fixtures count
   * in a single API call where possible.
   */
  fetchSeasonPreview?(seasonExternalId: number): Promise<SeasonPreviewDTO | null>;
}
