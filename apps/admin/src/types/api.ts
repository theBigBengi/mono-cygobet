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

export interface AdminSyncCountriesResponse {
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
