import { apiGet, apiPost } from "@/lib/api";
import type {
  AdminSeasonsListResponse,
  AdminProviderSeasonsResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const seasonsService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    leagueId?: number;
    isCurrent?: boolean;
    include?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.leagueId)
      searchParams.append("leagueId", params.leagueId.toString());
    if (params?.isCurrent !== undefined)
      searchParams.append("isCurrent", params.isCurrent.toString());
    if (params?.include) searchParams.append("include", params.include);

    const queryString = searchParams.toString();
    const url = `/admin/db/seasons${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminSeasonsListResponse>(url);
  },

  async getFromProvider() {
    return apiGet<AdminProviderSeasonsResponse>("/admin/provider/seasons");
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync/seasons", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync/seasons/${id}`, { dryRun });
  },

  async getBatches(name?: string, limit = 20) {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    params.append("limit", limit.toString());
    return apiGet<AdminBatchesListResponse>(
      `/admin/db/batches?${params.toString()}`
    );
  },

  async getBatchItems(batchId: number, page = 1, perPage = 50) {
    return apiGet<AdminBatchItemsResponse>(
      `/admin/db/batches/${batchId}/items?page=${page}&perPage=${perPage}`
    );
  },
};

