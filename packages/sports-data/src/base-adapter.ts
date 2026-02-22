/**
 * BaseSportsDataAdapter — abstract base class with default implementations.
 *
 * Layer 1 (abstract): adapter MUST implement — core data every provider has.
 * Layer 2 (defaults): adapter CAN override for efficiency — base class provides fallbacks.
 * Layer 3 (capabilities): tells admin UI what the provider natively supports.
 */

import type {
  BookmakerDTO,
  CountryDTO,
  ExternalId,
  FixtureDTO,
  LeagueDTO,
  MarketDTO,
  OddsDTO,
  SeasonDTO,
  SeasonPreviewDTO,
  StandingDTO,
  TeamDTO,
} from "@repo/types/sport-data/common";
import type {
  ISportsDataAdapter,
  FixtureFetchOptions,
  FixturesBySeasonOptions,
  OddsFetchOptions,
  ProviderCapabilities,
} from "./adapter.interface";

export abstract class BaseSportsDataAdapter implements ISportsDataAdapter {
  // ── Layer 3: Capabilities ──
  abstract readonly capabilities: ProviderCapabilities;

  // ── Layer 1: Abstract methods (every adapter implements) ──

  abstract fetchCountries(): Promise<CountryDTO[]>;
  abstract fetchLeagues(): Promise<LeagueDTO[]>;
  abstract fetchSeasons(): Promise<SeasonDTO[]>;
  abstract fetchTeams(): Promise<TeamDTO[]>;
  abstract fetchFixturesBySeason(
    seasonId: ExternalId,
    opts?: FixturesBySeasonOptions
  ): Promise<FixtureDTO[]>;
  abstract fetchLiveFixtures(opts?: FixtureFetchOptions): Promise<FixtureDTO[]>;

  // ── Layer 2: Default implementations (adapter can override) ──

  async fetchCountryById(id: ExternalId): Promise<CountryDTO | null> {
    const all = await this.fetchCountries();
    return all.find((c) => String(c.externalId) === String(id)) ?? null;
  }

  async fetchLeagueById(id: ExternalId): Promise<LeagueDTO | null> {
    const all = await this.fetchLeagues();
    return all.find((l) => String(l.externalId) === String(id)) ?? null;
  }

  async fetchSeasonById(id: ExternalId): Promise<SeasonDTO | null> {
    const all = await this.fetchSeasons();
    return all.find((s) => String(s.externalId) === String(id)) ?? null;
  }

  async fetchTeamById(id: ExternalId): Promise<TeamDTO | null> {
    const all = await this.fetchTeams();
    return all.find((t) => String(t.externalId) === String(id)) ?? null;
  }

  async fetchFixtureById(id: ExternalId): Promise<FixtureDTO | null> {
    const results = await this.fetchFixturesByIds([id]);
    return results[0] ?? null;
  }

  async fetchFixturesBetween(
    _startIso: string,
    _endIso: string,
    _opts?: FixtureFetchOptions
  ): Promise<FixtureDTO[]> {
    return [];
  }

  async fetchFixturesByIds(
    _ids: ExternalId[],
    _opts?: FixtureFetchOptions
  ): Promise<FixtureDTO[]> {
    return [];
  }

  async fetchFixturesByLeague(_leagueId: ExternalId): Promise<FixtureDTO[]> {
    return [];
  }

  async fetchTeamsByLeague(_leagueId: ExternalId): Promise<TeamDTO[]> {
    return [];
  }

  async fetchStandingsByLeague(_leagueId: ExternalId): Promise<StandingDTO[]> {
    return [];
  }

  async fetchTeamsBySeason(_seasonId: ExternalId): Promise<TeamDTO[]> {
    return [];
  }

  async fetchStandingsBySeason(
    _seasonId: ExternalId
  ): Promise<StandingDTO[]> {
    return [];
  }

  async fetchAllSeasons(): Promise<SeasonDTO[]> {
    return this.fetchSeasons();
  }

  async fetchSeasonPreview(
    _seasonId: ExternalId
  ): Promise<SeasonPreviewDTO | null> {
    return null;
  }

  async fetchOddsBetween(
    _startIso: string,
    _endIso: string,
    _opts?: OddsFetchOptions
  ): Promise<OddsDTO[]> {
    return [];
  }

  async fetchBookmakers(): Promise<BookmakerDTO[]> {
    return [];
  }

  async fetchMarkets(): Promise<MarketDTO[]> {
    return [];
  }

  getStats(): Record<string, unknown> {
    return {};
  }
}
