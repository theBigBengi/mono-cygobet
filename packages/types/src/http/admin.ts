import type { FixtureDTO } from "../sport-data/common";

// Admin API response types

export interface AdminSyncCenterOverviewResponse {
  status: string;
  data: {
    entities: Array<{
      name: string;
      dbCount: number;
      lastSyncedAt: string | null;
      lastSyncStatus: string | null;
      breakdown?: Record<string, number>;
      currentCount?: number;
    }>;
  };
  message: string;
}

export interface AdminHealthResponse {
  status: string;
  timestamp: string;
  database: {
    status: string;
    connected: boolean;
  };
  adapter?: Record<string, unknown>;
}

export interface AdminCountriesListResponse {
  status: string;
  data: Array<{
    id: number;
    name: string;
    iso2: string | null;
    iso3: string | null;
    imagePath: string | null;
    active: boolean | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
    leaguesCount?: number;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminCountryResponse {
  status: string;
  data: {
    id: number;
    name: string;
    iso2: string | null;
    iso3: string | null;
    imagePath: string | null;
    active: boolean | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
    leaguesCount?: number;
  };
  message: string;
}

export interface AdminProviderCountriesResponse {
  status: string;
  data: Array<{
    externalId: number | string;
    name: string;
    imagePath?: string | null;
    iso2?: string | null;
    iso3?: string | null;
    availableLeaguesCount?: number;
  }>;
  message: string;
  provider: string;
}

export interface AdminLeaguesListResponse {
  status: string;
  data: Array<{
    id: number;
    name: string;
    type: string;
    shortCode: string | null;
    subType: string | null;
    imagePath: string | null;
    countryId: number;
    country: {
      id: number;
      name: string;
      imagePath: string | null;
      iso2: string | null;
      iso3: string | null;
      externalId: string;
    } | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminLeagueResponse {
  status: string;
  data: {
    id: number;
    name: string;
    type: string;
    shortCode: string | null;
    subType: string | null;
    imagePath: string | null;
    countryId: number;
    country: {
      id: number;
      name: string;
      imagePath: string | null;
      iso2: string | null;
      iso3: string | null;
      externalId: string;
    } | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

export interface AdminProviderLeaguesResponse {
  status: string;
  data: Array<{
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
  }>;
  message: string;
  provider: string;
}

export interface AdminSyncCountriesResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

export interface AdminSyncLeaguesResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

export interface BatchItem {
  id: number;
  itemKey: string | null;
  status: string;
  errorMessage: string | null;
  meta: Record<string, unknown>;
}

export interface Batch {
  id: number;
  name: string;
  version: string | null;
  status: string;
  triggeredBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  itemsTotal: number;
  itemsSuccess: number;
  itemsFailed: number;
}

export interface AdminBatchesListResponse {
  status: string;
  data: Batch[];
  message: string;
}

export interface AdminBatchItemsResponse {
  status: string;
  data: BatchItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminJobsListResponse {
  status: string;
  data: Array<{
    key: string;
    description: string | null;
    scheduleCron: string | null;
    enabled: boolean;
    meta: Record<string, unknown>;
    runnable: boolean;
    createdAt: string;
    updatedAt: string;
    lastRun: null | {
      id: number;
      status: string;
      trigger: string;
      triggeredBy: string | null;
      startedAt: string;
      finishedAt: string | null;
      durationMs: number | null;
      rowsAffected: number | null;
      errorMessage: string | null;
      meta?: Record<string, unknown>;
    };
    /** Last 10 runs for mini bar on list cards (optional). */
    lastRuns?: Array<{
      id: number;
      status: string;
      startedAt: string;
      durationMs: number | null;
      rowsAffected: number | null;
      meta?: Record<string, unknown>;
    }>;
  }>;
  message: string;
}

export interface AdminUpdateJobResponse {
  status: string;
  data: AdminJobsListResponse["data"][0] | null;
  message: string;
}

/** Single job with last 10 runs (for job detail page). */
export interface AdminJobDetailResponse {
  status: string;
  data: {
    key: string;
    description: string | null;
    scheduleCron: string | null;
    enabled: boolean;
    meta: Record<string, unknown>;
    runnable: boolean;
    createdAt: string;
    updatedAt: string;
    lastRuns: Array<{
      id: number;
      status: string;
      trigger: string;
      triggeredBy: string | null;
      startedAt: string;
      finishedAt: string | null;
      durationMs: number | null;
      rowsAffected: number | null;
      errorMessage: string | null;
      meta: Record<string, unknown>;
    }>;
  } | null;
  message: string;
}

/** Single job run (for run detail page). */
export interface AdminJobRunResponse {
  status: string;
  data: AdminJobRunsListResponse["data"][0] | null;
  message: string;
}

export interface AdminJobRunsListResponse {
  status: string;
  data: Array<{
    id: number;
    jobKey: string;
    job: { key: string; description: string | null } | null;
    status: string;
    trigger: string;
    triggeredBy: string | null;
    triggeredById: string | null;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    rowsAffected: number | null;
    errorMessage: string | null;
    errorStack: string | null;
    meta: Record<string, unknown>;
  }>;
  nextCursor: number | null;
  summary: {
    running: number;
    failed: number;
    success: number;
    noOp: number;
  };
  message: string;
}

export interface AdminRunJobResponse {
  status: string;
  data: {
    jobKey: string;
    jobRunId: number | null;
    result: unknown;
  };
  message: string;
}

export interface AdminRunAllJobsResponse {
  status: string;
  data: {
    triggeredCount: number;
    ok: number;
    fail: number;
    results: Array<{
      jobKey: string;
      jobRunId: number | null;
      status: "success" | "error";
      error?: string;
    }>;
  };
  message: string;
}

export interface AdminMeResponse {
  status: "success";
  data: {
    id: number;
    email: string;
    role: string;
    name: string | null;
    lastLoginAt: string | null;
  };
}

export interface AdminUsersListResponse {
  status: "success";
  data: {
    users: Array<{
      id: number;
      email: string;
      name: string | null;
      username: string | null;
      role: "admin" | "user";
      image: string | null;
      createdAt: string;
      emailVerifiedAt: string | null;
      lastLoginAt: string | null;
    }>;
    total: number;
  };
  message: string;
}

export interface AdminUserResponse {
  status: "success" | "error";
  data: {
    id: number;
    email: string;
    name: string | null;
    username: string | null;
    role: "admin" | "user";
    image: string | null;
    createdAt: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
  } | null;
  message: string;
}

export interface AdminCreateUserResponse {
  status: "success" | "error";
  data: {
    id: number;
    email: string;
    name: string | null;
    username: string | null;
    role: "admin" | "user";
    image: string | null;
    createdAt: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
  } | null;
  message: string;
}

export interface AdminUpdateUserResponse {
  status: "success" | "error";
  data: {
    id: number;
    email: string;
    name: string | null;
    username: string | null;
    role: "admin" | "user";
    image: string | null;
    createdAt: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
  } | null;
  message: string;
}

export interface AdminTeamsListResponse {
  status: string;
  data: Array<{
    id: number;
    name: string;
    type: string | null;
    shortCode: string | null;
    imagePath: string | null;
    founded: number | null;
    countryId: number | null;
    country: {
      id: number;
      name: string;
      imagePath: string | null;
      iso2: string | null;
      iso3: string | null;
      externalId: string;
    } | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminTeamResponse {
  status: string;
  data: {
    id: number;
    name: string;
    type: string | null;
    shortCode: string | null;
    imagePath: string | null;
    founded: number | null;
    countryId: number | null;
    country: {
      id: number;
      name: string;
      imagePath: string | null;
      iso2: string | null;
      iso3: string | null;
      externalId: string;
    } | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

export interface AdminProviderTeamsResponse {
  status: string;
  data: Array<{
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
  }>;
  message: string;
  provider: string;
}

export interface AdminSeasonsListResponse {
  status: string;
  data: Array<{
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    leagueId: number;
    league: {
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
    externalId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminSeasonResponse {
  status: string;
  data: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    leagueId: number;
    league: {
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
    externalId: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

export interface AdminProviderSeasonsResponse {
  status: string;
  data: Array<{
    externalId: number | string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    leagueExternalId: number | string | null;
    league?: {
      id: number;
      name: string;
    } | null;
    leagueInDb?: boolean;
    countryName?: string | null;
  }>;
  message: string;
  provider: string;
}

export interface AdminSyncSeasonsResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

export interface AdminBookmakersListResponse {
  status: string;
  data: Array<{
    id: number;
    name: string;
    externalId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminBookmakerResponse {
  status: string;
  data: {
    id: number;
    name: string;
    externalId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

export interface AdminOddsListResponse {
  status: string;
  data: Array<{
    id: number;
    externalId: string;
    fixtureId: number;
    fixtureExternalId: string;
    fixtureName: string | null;
    bookmakerId: number | null;
    bookmakerExternalId: string | null;
    bookmakerName: string | null;
    marketExternalId: string;
    marketName: string | null;
    marketDescription: string;
    sortOrder: number;
    label: string;
    name: string | null;
    handicap: string | null;
    total: string | null;
    value: string;
    probability: string | null;
    winning: boolean;
    startingAt: string;
    startingAtTimestamp: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminProviderBookmakersResponse {
  status: string;
  data: Array<{
    externalId: number | string;
    name: string;
  }>;
  message: string;
  provider: string;
}

export interface AdminProviderMarketsResponse {
  status: string;
  data: Array<{
    externalId: string;
    name: string;
    description?: string | null;
    developerName?: string | null;
  }>;
  message: string;
  provider: string;
}

export interface AdminSyncBookmakersResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

export interface AdminFixturesListResponse {
  status: string;
  data: Array<{
    id: number;
    name: string;
    startIso: string;
    startTs: number;
    state: string;
    result: string | null;
    homeScore: number | null;
    awayScore: number | null;
    stage: string | null;
    round: string | null;
    leagueId: number | null;
    seasonId: number | null;
    homeTeamId: number;
    awayTeamId: number;
    homeTeam: {
      id: number;
      name: string;
      imagePath: string | null;
      externalId: string;
    } | null;
    awayTeam: {
      id: number;
      name: string;
      imagePath: string | null;
      externalId: string;
    } | null;
    league: {
      id: number;
      name: string;
      imagePath: string | null;
      type: string;
      externalId: string;
    } | null;
    season: {
      id: number;
      name: string;
      externalId: string;
    } | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  message: string;
}

export interface AdminFixtureResponse {
  status: string;
  data: {
    id: number;
    name: string;
    startIso: string;
    startTs: number;
    state: string;
    result: string | null;
    homeScore: number | null;
    awayScore: number | null;
    stage: string | null;
    round: string | null;
    leagueId: number | null;
    seasonId: number | null;
    homeTeamId: number;
    awayTeamId: number;
    homeTeam: {
      id: number;
      name: string;
      imagePath: string | null;
      externalId: string;
    } | null;
    awayTeam: {
      id: number;
      name: string;
      imagePath: string | null;
      externalId: string;
    } | null;
    league: {
      id: number;
      name: string;
      imagePath: string | null;
      type: string;
      externalId: string;
    } | null;
    season: {
      id: number;
      name: string;
      externalId: string;
    } | null;
    externalId: string;
    createdAt: string;
    updatedAt: string;
    /** Set when score/state was manually overridden (vs provider). Present after server supports override audit. */
    scoreOverriddenAt?: string | null;
    /** Admin user who last overrode score/state. */
    scoreOverriddenById?: number | null;
    scoreOverriddenBy?: { id: number; name: string | null; email: string } | null;
  };
  message: string;
}

export interface AdminProviderFixturesResponse {
  status: string;
  data: Array<FixtureDTO>;
  message: string;
  provider: string;
}

export interface AdminProviderOddsResponse {
  status: string;
  data: Array<{
    bookmakerId: number;
    marketExternalId: number;
    externalId: number;
    name: string | null;
    value: string;
    marketDescription: string;
    winning: boolean;
    startingAt: string;
    startingAtTs: number;
    probability: string;
    total: string | null;
    handicap: string | null;
    label: string;
    sortOrder: number;
    fixtureExternalId: number;
    fixtureName: string | null;
    bookmakerExternalId: number;
    bookmakerName: string;
    marketName: string;
  }>;
  message: string;
  provider: string;
}

export interface AdminSyncFixturesResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
    /** First error message when fail > 0 (for debugging). */
    firstError?: string;
  };
  message: string;
}

/** Response shape for POST /admin/fixtures/:id/resettle */
export interface AdminFixtureResettleResponse {
  groupsAffected: number;
  predictionsRecalculated: number;
}

/** One group in settlement summary for a fixture */
export interface AdminFixtureSettlementGroup {
  groupId: number;
  groupName: string;
  predictionsSettled: number;
}

/** Response shape for GET /admin/fixtures/:id/settlement */
export interface AdminFixtureSettlementSummaryResponse {
  groups: AdminFixtureSettlementGroup[];
}

export interface AdminSyncTeamsResponse {
  status: string;
  data: {
    batchId: number | null;
    ok: number;
    fail: number;
    total: number;
  };
  message: string;
}

export interface AdminDashboardRecentFailedJob {
  id: number;
  jobKey: string;
  errorMessage: string | null;
  startedAt: string;
}

export interface AdminDashboardFixtureNeedingAttention {
  id: number;
  name: string;
  state: string;
  updatedAt: string;
  issue: string;
}

export interface AdminDashboardResponse {
  liveCount: number;
  pendingSettlement: number;
  failedJobs24h: number;
  stuckFixtures: number;
  recentFailedJobs: AdminDashboardRecentFailedJob[];
  fixturesNeedingAttention: AdminDashboardFixtureNeedingAttention[];
}
