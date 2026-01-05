import { apiGet, apiPost } from "@/lib/api";
import type {
  AdminTeamsListResponse,
  AdminProviderTeamsResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const teamsService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    countryId?: number;
    type?: string;
    include?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.countryId)
      searchParams.append("countryId", params.countryId.toString());
    if (params?.type) searchParams.append("type", params.type);
    if (params?.include) searchParams.append("include", params.include);

    const queryString = searchParams.toString();
    const url = `/admin/sync-center/db/teams${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminTeamsListResponse>(url);
  },

  async getFromProvider() {
    return apiGet<AdminProviderTeamsResponse>("/admin/sync-center/provider/teams");
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync-center/sync/teams", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync-center/sync/teams/${id}`, { dryRun });
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

