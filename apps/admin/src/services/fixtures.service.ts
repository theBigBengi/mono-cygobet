import { apiGet, apiPost } from "@/lib/api";
import type {
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const fixturesService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    leagueId?: number;
    leagueIds?: number[];
    countryIds?: number[];
    seasonId?: number;
    state?: string;
    include?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.leagueId)
      searchParams.append("leagueId", params.leagueId.toString());
    if (params?.leagueIds && params.leagueIds.length > 0) {
      params.leagueIds.forEach((id) => {
        searchParams.append("leagueIds", id.toString());
      });
    }
    if (params?.countryIds && params.countryIds.length > 0) {
      params.countryIds.forEach((id) => {
        searchParams.append("countryIds", id.toString());
      });
    }
    if (params?.seasonId)
      searchParams.append("seasonId", params.seasonId.toString());
    if (params?.state) searchParams.append("state", params.state);
    if (params?.include) searchParams.append("include", params.include);

    const queryString = searchParams.toString();
    const url = `/admin/db/fixtures${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminFixturesListResponse>(url);
  },

  async getFromProvider(
    from?: string,
    to?: string,
    seasonId?: number,
    leagueIds?: number[],
    countryIds?: number[]
  ) {
    const searchParams = new URLSearchParams();
    if (from) searchParams.append("from", from);
    if (to) searchParams.append("to", to);
    if (seasonId) searchParams.append("seasonId", seasonId.toString());
    if (leagueIds && leagueIds.length > 0) {
      leagueIds.forEach((id) => {
        searchParams.append("leagueIds", id.toString());
      });
    }
    if (countryIds && countryIds.length > 0) {
      countryIds.forEach((id) => {
        searchParams.append("countryIds", id.toString());
      });
    }

    const queryString = searchParams.toString();
    const url = `/admin/provider/fixtures${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminProviderFixturesResponse>(url);
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync/fixtures", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync/fixtures/${id}`, { dryRun });
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
