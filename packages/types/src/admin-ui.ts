// Frontend-specific unified types for admin UI

export interface CountryDB {
  id: number;
  name: string;
  iso2: string | null;
  iso3: string | null;
  imagePath: string | null;
  externalId: string;
  leagues?: Array<{ id: number; name: string }>;
}

export interface CountryProvider {
  externalId: number | string;
  name: string;
  imagePath?: string | null;
  iso2?: string | null;
  iso3?: string | null;
  leaguesCount?: number;
  availableLeaguesCount?: number;
}

export interface UnifiedCountry {
  externalId: string;
  name: string;
  imagePath: string | null;
  iso2: string | null;
  iso3: string | null;
  source: "db" | "provider" | "both";
  status:
    | "ok"
    | "missing-in-db"
    | "extra-in-db"
    | "mismatch"
    | "no-leagues"
    | "iso-missing"
    | "new";
  dbData?: CountryDB;
  providerData?: CountryProvider;
  leaguesCount?: number;
  availableLeaguesCount?: number;
  updatedAt?: string;
}

export interface LeagueDB {
  id: number;
  name: string;
  type: string;
  shortCode: string | null;
  subType: string | null;
  imagePath: string | null;
  countryId: number;
  externalId: string;
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
  imagePath?: string | null;
  countryExternalId?: number | string | null;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
  } | null;
  countryInDb?: boolean;
  shortCode?: string | null;
  type?: string | null;
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
export type CountryStatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch"
  | "has-leagues"
  | "iso-issues";

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
  imagePath?: string | null;
  countryExternalId?: number | string | null;
  country?: {
    id: number;
    name: string;
    imagePath: string | null;
    iso2: string | null;
    iso3: string | null;
  } | null;
  leagueInDb?: boolean;
  shortCode?: string | null;
  founded?: number | null;
  type?: string | null;
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

