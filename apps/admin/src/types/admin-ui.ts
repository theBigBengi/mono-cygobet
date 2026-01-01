// src/types/admin-ui.ts
// Frontend-specific unified types for admin UI

export interface CountryDB {
  id: number;
  name: string;
  iso2: string | null;
  iso3: string | null;
  imagePath: string | null;
  active: boolean;
  externalId: string;
  createdAt: string;
  updatedAt: string;
  leaguesCount?: number;
}

export interface CountryProvider {
  externalId: number | string;
  name: string;
  iso2: string | null;
  iso3: string | null;
  imagePath: string | null;
}

export interface UnifiedCountry {
  externalId: string;
  name: string;
  iso2: string | null;
  iso3: string | null;
  imagePath: string | null;
  active: boolean;
  source: "db" | "provider" | "both";
  status: "ok" | "missing-in-db" | "extra-in-db" | "mismatch" | "new";
  dbData?: CountryDB;
  providerData?: CountryProvider;
  leaguesCount?: number;
  updatedAt?: string;
}

export type CountryStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch";

export interface LeagueDB {
  id: number;
  name: string;
  type: string | null;
  shortCode: string | null;
  subType: string | null;
  imagePath: string | null;
  countryId: number | null;
  externalId: string;
  createdAt: string;
  updatedAt: string;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
    externalId: string;
  } | null;
}

export interface LeagueProvider {
  externalId: number | string;
  name: string;
  imagePath: string | null;
  type: string | null;
  shortCode: string | null;
  countryExternalId: number | string | null;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
    externalId: string;
  } | null;

  subType?: string | null;
}

export interface UnifiedLeague {
  externalId: string;
  name: string;
  imagePath: string | null;
  type: string | null;
  shortCode: string | null;
  subType: string | null;
  source: "db" | "provider" | "both";
  status: "ok" | "missing-in-db" | "extra-in-db" | "mismatch" | "new";
  dbData?: LeagueDB;
  providerData?: LeagueProvider;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
    externalId: string;
  } | null;
  countryInDb?: boolean;
  updatedAt?: string;
}

export type ViewMode = "db" | "provider";

export type LeagueStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch";

export interface TeamDB {
  id: number;
  name: string;
  type: string | null;
  shortCode: string | null;
  imagePath: string | null;
  founded: number | null;
  countryId: number | null;
  externalId: string;
  createdAt: string;
  updatedAt: string;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
    externalId: string;
  } | null;
}

export interface TeamProvider {
  externalId: number | string;
  name: string;
  imagePath: string | null;
  type: string | null;
  shortCode: string | null;
  founded: number | null;
  countryExternalId: number | string | null;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
    externalId: string;
  } | null;
  type?: string | null;
  leagueInDb?: boolean;
}

export interface UnifiedTeam {
  externalId: string;
  name: string;
  imagePath: string | null;
  type: string | null;
  shortCode: string | null;
  founded: number | null;
  source: "db" | "provider" | "both";
  status: "ok" | "missing-in-db" | "extra-in-db" | "mismatch" | "new";
  dbData?: TeamDB;
  providerData?: TeamProvider;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
    externalId: string;
  } | null;
  leagueInDb?: boolean;
  updatedAt?: string;
}

export type TeamStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch";

export interface SeasonDB {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  leagueId: number | null;
  externalId: string;
  createdAt: string;
  updatedAt: string;
  league?: {
    id: number;
    name: string;
    imagePath: string | null;
    type: string;
    externalId: string;
    country: {
      id: number;
      name: string;
      imagePath: string | null;
      iso2: string | null;
      iso3: string | null;
      externalId: string;
    } | null;
  } | null;
}

export interface SeasonProvider {
  externalId: number | string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  leagueExternalId: number | string | null;
  leagueInDb?: boolean;
  countryName?: string | null;
}

export interface UnifiedSeason {
  externalId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  source: "db" | "provider" | "both";
  status: "ok" | "missing-in-db" | "extra-in-db" | "mismatch" | "new";
  dbData?: SeasonDB;
  providerData?: SeasonProvider;
  league?: {
    id: number;
    name: string;
    imagePath: string | null;
    type: string;
    externalId: string;
    country: {
      id: number;
      name: string;
      imagePath: string | null;
      iso2: string | null;
      iso3: string | null;
      externalId: string;
    } | null;
  } | null;
  leagueInDb?: boolean;
  updatedAt?: string;
}

export type SeasonStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch";

export interface BookmakerDB {
  id: number;
  name: string;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookmakerProvider {
  externalId: number | string;
  name: string;
}

export interface UnifiedBookmaker {
  externalId: string;
  name: string;
  source: "db" | "provider" | "both";
  status: "ok" | "missing-in-db" | "extra-in-db" | "mismatch" | "new";
  dbData?: BookmakerDB;
  providerData?: BookmakerProvider;
  updatedAt?: string;
}

export type BookmakerStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch"
  | "new";

export interface FixtureDB {
  id: number;
  name: string;
  startIso: string;
  startTs: number;
  state: string;
  result: string | null;
  homeScore: number | null;
  awayScore: number | null;
  stageRoundName: string | null;
  leagueId: number | null;
  seasonId: number | null;
  homeTeamId: number;
  awayTeamId: number;
  externalId: string;
  createdAt: string;
  updatedAt: string;
  homeTeam?: {
    id: number;
    name: string;
    imagePath: string | null;
    externalId: string;
  } | null;
  awayTeam?: {
    id: number;
    name: string;
    imagePath: string | null;
    externalId: string;
  } | null;
  league?: {
    id: number;
    name: string;
    imagePath: string | null;
    type: string;
    externalId: string;
  } | null;
  season?: {
    id: number;
    name: string;
    externalId: string;
  } | null;
}

export interface FixtureProvider {
  externalId: number | string;
  name: string;
  startIso: string | null;
  startTs: number;
  state: string;
  result: string | null;
  stageRoundName: string | null;
  leagueExternalId: number | string | null;
  seasonExternalId: number | string | null;
  homeTeamExternalId: number | string;
  awayTeamExternalId: number | string;
  leagueInDb: boolean;
  seasonInDb: boolean;
  leagueName: string | null;
  countryName: string | null;
  hasOdds: boolean;
}

export interface UnifiedFixture {
  externalId: string;
  name: string;
  startIso: string | null;
  startTs: number;
  state: string;
  result: string | null;
  stageRoundName: string | null;
  source: "db" | "provider" | "both";
  status: "ok" | "missing-in-db" | "extra-in-db" | "mismatch" | "new";
  dbData?: FixtureDB;
  providerData?: FixtureProvider;
  league?: {
    id: number;
    name: string;
    imagePath: string | null;
    type: string;
    externalId: string;
  } | null;
  season?: {
    id: number;
    name: string;
    externalId: string;
  } | null;
  homeTeam?: {
    id: number;
    name: string;
    imagePath: string | null;
    externalId: string;
  } | null;
  awayTeam?: {
    id: number;
    name: string;
    imagePath: string | null;
    externalId: string;
  } | null;
  leagueInDb?: boolean;
  seasonInDb?: boolean;
  updatedAt?: string;
  // Provider-specific fields
  leagueName?: string | null;
  countryName?: string | null;
  hasOdds?: boolean;
}

export type FixtureStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch";

// Shared filter type used across all admin tables
export type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";
