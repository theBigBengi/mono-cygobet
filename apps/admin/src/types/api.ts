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
