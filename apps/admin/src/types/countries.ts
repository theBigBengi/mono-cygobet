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
  updatedAt?: string;
}

export type ViewMode = "db" | "provider" | "diff";
export type StatusFilter =
  | "all"
  | "ok"
  | "missing-in-db"
  | "extra-in-db"
  | "mismatch"
  | "has-leagues"
  | "iso-issues";

