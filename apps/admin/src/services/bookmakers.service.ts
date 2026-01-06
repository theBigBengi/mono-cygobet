import { apiGet, apiPost } from "@/lib/adminApi";
import type {
  AdminBookmakersListResponse,
  AdminProviderBookmakersResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const bookmakersService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());

    const queryString = searchParams.toString();
    const url = `/admin/sync-center/db/bookmakers${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminBookmakersListResponse>(url);
  },

  async getFromProvider() {
    return apiGet<AdminProviderBookmakersResponse>("/admin/sync-center/provider/bookmakers");
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync-center/sync/bookmakers", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync-center/sync/bookmakers/${id}`, { dryRun });
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

