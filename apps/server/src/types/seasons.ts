// src/types/seasons.ts
// Type definitions for seasons routes

export interface ListSeasonsQuerystring {
  page?: number;
  perPage?: number;
  leagueId?: number;
  isCurrent?: boolean;
  include?: string;
}

export interface GetSeasonQuerystring {
  include?: string;
}

export interface GetSeasonParams {
  id: string;
}

export interface SearchSeasonsQuerystring {
  q: string;
  take?: number;
}
