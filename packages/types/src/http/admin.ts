// Admin API response types
export interface AdminHealthResponse {
  status: string;
  timestamp: string;
  database: {
    status: string;
    connected: boolean;
  };
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
  batchId: number | null;
  ok: number;
  fail: number;
  total: number;
}

export interface AdminSyncLeaguesResponse {
  batchId: number | null;
  ok: number;
  fail: number;
  total: number;
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
  trigger: string;
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
  batchId: number | null;
  ok: number;
  fail: number;
  total: number;
}
