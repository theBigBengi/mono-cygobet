import { apiGet, apiPost, apiPatch } from "@/lib/adminApi";
import type {
  AdminTeamsListResponse,
  AdminTeamsBulkUpdateResponse,
  AdminProviderTeamsResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
  AdminUpdateTeamResponse,
} from "@repo/types";

export const teamsService = {
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
    const url = `/admin/sync-center/db/teams${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminTeamsListResponse>(url);
  },

  async getFromProvider() {
    return apiGet<AdminProviderTeamsResponse>(
      "/admin/sync-center/provider/teams"
    );
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

  async search(query: string, take = 20) {
    const params = new URLSearchParams({ q: query, take: String(take) });
    return apiGet<AdminTeamsListResponse>(
      `/admin/sync-center/db/teams/search?${params.toString()}`
    );
  },

  async update(
    id: number,
    data: {
      name?: string;
      shortCode?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      tertiaryColor?: string | null;
    }
  ) {
    return apiPatch<AdminUpdateTeamResponse>(
      `/admin/sync-center/db/teams/${id}`,
      data
    );
  },

  async bulkUpdate(
    teams: {
      name: string;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      tertiaryColor?: string | null;
    }[]
  ) {
    return apiPost<AdminTeamsBulkUpdateResponse>(
      "/admin/sync-center/db/teams/bulk-update",
      { teams }
    );
  },
};
