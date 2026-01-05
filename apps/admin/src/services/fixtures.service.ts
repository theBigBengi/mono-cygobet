import { apiGet, apiPost, apiPatch } from "@/lib/api";
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
    leagueIds?: string[]; // External IDs
    countryIds?: string[]; // External IDs
    seasonId?: number;
    state?: string;
    include?: string;
    fromTs?: number; // Start timestamp filter
    toTs?: number; // End timestamp filter
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.leagueId)
      searchParams.append("leagueId", params.leagueId.toString());
    if (params?.leagueIds && params.leagueIds.length > 0) {
      searchParams.append("leagueIds", params.leagueIds.join(","));
    }
    if (params?.countryIds && params.countryIds.length > 0) {
      searchParams.append("countryIds", params.countryIds.join(","));
    }
    if (params?.seasonId)
      searchParams.append("seasonId", params.seasonId.toString());
    if (params?.state) searchParams.append("state", params.state);
    if (params?.include) searchParams.append("include", params.include);
    if (params?.fromTs !== undefined)
      searchParams.append("fromTs", params.fromTs.toString());
    if (params?.toTs !== undefined)
      searchParams.append("toTs", params.toTs.toString());

    const queryString = searchParams.toString();
    const url = `/admin/sync-center/db/fixtures${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminFixturesListResponse>(url);
  },

  async getFromProvider(
    from?: string,
    to?: string,
    seasonId?: number,
    leagueIds?: string[], // External IDs
    countryIds?: string[] // External IDs
  ) {
    // If seasonId is provided, use the dedicated season route
    if (seasonId) {
      const searchParams = new URLSearchParams();
      if (leagueIds && leagueIds.length > 0) {
        searchParams.append("leagueIds", leagueIds.join(","));
      }
      if (countryIds && countryIds.length > 0) {
        searchParams.append("countryIds", countryIds.join(","));
      }

      const queryString = searchParams.toString();
      const url = `/admin/sync-center/provider/fixtures/season/${seasonId}${
        queryString ? `?${queryString}` : ""
      }`;
      return apiGet<AdminProviderFixturesResponse>(url);
    }

    // Otherwise, use the date range route
    const searchParams = new URLSearchParams();
    if (from) searchParams.append("from", from);
    if (to) searchParams.append("to", to);
    if (leagueIds && leagueIds.length > 0) {
      searchParams.append("leagueIds", leagueIds.join(","));
    }
    if (countryIds && countryIds.length > 0) {
      searchParams.append("countryIds", countryIds.join(","));
    }

    const queryString = searchParams.toString();
    const url = `/admin/sync-center/provider/fixtures${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminProviderFixturesResponse>(url);
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync-center/sync/fixtures", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync-center/sync/fixtures/${id}`, { dryRun });
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

  async update(
    id: number | string,
    data: {
      name?: string;
      state?: string;
      homeScore?: number | null;
      awayScore?: number | null;
      result?: string | null;
    }
  ) {
    return apiPatch(`/admin/sync-center/db/fixtures/${id}`, data);
  },
};
