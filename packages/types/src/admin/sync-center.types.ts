// Sync Center – availability, seed season, job status

export interface AvailableSeason {
  externalId: number;
  name: string;
  league: {
    externalId: number;
    name: string;
    country: string;
  };
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isFinished: boolean;
  isPending: boolean;
  status: "new" | "in_db";
  dbId?: number;
  fixturesCount?: number;
  teamsCount?: number;
  lastSyncedAt?: string;
  /** True when season is in_db with 0 fixtures and provider has fixtures to sync */
  hasFixturesAvailable?: boolean;
}

export interface AdminAvailabilityResponse {
  status: "ok";
  data: {
    /** Display name of the current sports data provider (e.g. SportMonks) */
    provider: string;
    seasons: AvailableSeason[];
    summary: {
      /** in_db, !isFinished && !isUpcoming */
      active: number;
      /** in_db, isPending or startDate > today */
      upcoming: number;
      /** status === "new" && !isFinished */
      new: number;
      /** Fixtures count only from active seasons */
      fixtures: number;
      /** Seasons in DB with 0 fixtures but provider has fixtures to sync */
      seasonsWithFixturesAvailable?: number;
    };
    lastChecked: string;
  };
}

export interface AdminSeedSeasonRequest {
  seasonExternalId: number;
  includeTeams?: boolean;
  includeFixtures?: boolean;
  /** Seed only future fixtures (default: true) */
  futureOnly?: boolean;
}

export interface AdminSeedSeasonResponse {
  status: "ok";
  data: {
    jobId: string;
    message: string;
  };
}

export interface AdminSeedSeasonPreviewRequest {
  seasonExternalId: number;
}

export interface AdminSeedSeasonPreviewResponse {
  status: "ok";
  data: {
    season: {
      externalId: number;
      name: string;
      exists: boolean;
    };
    league: {
      externalId: number;
      name: string;
      exists: boolean;
    };
    country: {
      externalId: number;
      name: string;
      exists: boolean;
    };
    counts: {
      teams: number;
      fixtures: number;
      fixturesFuture: number;
    };
  };
}

export interface AdminJobStatusResponse {
  status: "ok";
  data: {
    jobId: string;
    state: "waiting" | "active" | "completed" | "failed";
    progress?: number;
    result?: {
      season: {
        id: number;
        name: string;
        league: string;
        created: boolean;
      };
      teams?: { ok: number; fail: number; total: number };
      fixtures?: { ok: number; fail: number; total: number };
    };
    error?: string;
  };
}
