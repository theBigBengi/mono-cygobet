// src/types/fixtures.ts
// Type definitions for fixtures routes

export interface ListFixturesQuerystring {
  page?: number;
  perPage?: number;
  leagueId?: number;
  leagueIds?: string; // Comma-separated string of external IDs
  countryIds?: string; // Comma-separated string of external IDs
  seasonId?: number;
  state?: string;
  include?: string;
  fromTs?: number; // Start timestamp filter
  toTs?: number; // End timestamp filter
}

export interface GetFixtureQuerystring {
  include?: string;
}

export interface GetFixtureParams {
  id: string;
}

export interface SearchFixturesQuerystring {
  q: string;
  take?: number;
}
