// src/types/leagues.ts
// Type definitions for leagues routes

export interface ListLeaguesQuerystring {
  page?: number;
  perPage?: number;
  countryId?: number;
  type?: string;
  include?: string;
}

export interface GetLeagueQuerystring {
  include?: string;
}

export interface GetLeagueParams {
  id: string;
}

export interface SearchLeaguesQuerystring {
  q: string;
  take?: number;
}
