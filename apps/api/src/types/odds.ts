// src/types/odds.ts

export interface ListOddsQuerystring {
  page?: number;
  perPage?: number;
  fixtureIds?: string; // comma-separated fixture external IDs
  bookmakerIds?: string; // comma-separated bookmaker external IDs
  marketIds?: string; // comma-separated market external IDs
  winning?: boolean;
  fromTs?: number;
  toTs?: number;
  include?: string;
}

