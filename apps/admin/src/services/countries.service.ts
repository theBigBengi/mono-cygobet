import { apiGet, apiPost } from "@/lib/adminApi";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const countriesService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    include?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.include) searchParams.append("include", params.include);

    const queryString = searchParams.toString();
    // Try /admin/sync-center/db/countries first (based on directory structure)
    const url = `/admin/sync-center/db/countries${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminCountriesListResponse>(url);
  },

  async getFromProvider() {
    // Try /admin/sync-center/provider/countries first (based on directory structure)
    return apiGet<AdminProviderCountriesResponse>("/admin/sync-center/provider/countries");
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync-center/sync/countries", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync-center/sync/countries/${id}`, { dryRun });
  },

  async getBatches(name?: string, limit = 20) {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    params.append("limit", limit.toString());
    return apiGet<AdminBatchesListResponse>(
      `/admin/sync-center/db/batches?${params.toString()}`
    );
  },

  async getBatchItems(batchId: number, page = 1, perPage = 50) {
    return apiGet<AdminBatchItemsResponse>(
      `/admin/sync-center/db/batches/${batchId}/items?page=${page}&perPage=${perPage}`
    );
  },
};
