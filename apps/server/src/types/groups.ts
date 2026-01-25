// src/types/groups.ts
// Shared types for groups API (route + service).

export type GroupFixturesFilter = {
  next?: number;
  nearestDateOnly?: boolean;
  leagueIds?: number[];
  teamIds?: number[];
  fromTs?: number;
  toTs?: number;
  states?: string[];
  stages?: string[];
  rounds?: number[];
};
