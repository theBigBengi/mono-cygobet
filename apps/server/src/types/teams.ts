// src/types/teams.ts
// Type definitions for teams routes

export interface ListTeamsQuerystring {
  page?: number;
  perPage?: number;
  countryId?: number;
  type?: string;
  search?: string;
  include?: string;
}

export interface GetTeamQuerystring {
  include?: string;
}

export interface GetTeamParams {
  id: string;
}

export interface SearchTeamsQuerystring {
  q: string;
  take?: number;
}
