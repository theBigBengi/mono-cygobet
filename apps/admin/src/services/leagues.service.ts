import { apiGet, apiPost } from "@/lib/adminApi";
import type {
  AdminLeaguesListResponse,
  AdminProviderLeaguesResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const leaguesService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    countryId?: number;
    type?: string;
    search?: string;
    include?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.countryId)
      searchParams.append("countryId", params.countryId.toString());
    if (params?.type) searchParams.append("type", params.type);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.include) searchParams.append("include", params.include);

    const queryString = searchParams.toString();
    const url = `/admin/sync-center/db/leagues${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminLeaguesListResponse>(url);
  },

  async getFromProvider() {
    return apiGet<AdminProviderLeaguesResponse>("/admin/sync-center/provider/leagues");
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync-center/sync/leagues", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync-center/sync/leagues/${id}`, { dryRun });
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

  async search(query: string, take = 20) {
    const params = new URLSearchParams({ q: query, take: String(take) });
    return apiGet<{
      status: string;
      data: Array<{
        id: number;
        name: string;
        shortCode: string | null;
        country: { name: string } | null;
      }>;
    }>(`/admin/sync-center/db/leagues/search?${params.toString()}`);
  },
};

