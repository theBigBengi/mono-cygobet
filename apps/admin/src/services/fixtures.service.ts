import { apiGet, apiPost, apiPatch } from "@/lib/adminApi";
import type {
  AdminFixturesListResponse,
  AdminFixtureResponse,
  AdminFixtureAuditLogResponse,
  AdminFixtureResettleResponse,
  AdminFixtureGroupsSummaryResponse,
  AdminProviderFixturesResponse,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
  AdminSyncFixturesResponse,
  AdminFixturesAttentionResponse,
  AdminFixtureSearchResponse,
  FixtureIssueType,
} from "@repo/types";

export const fixturesService = {
  async getById(id: number | string) {
    return apiGet<AdminFixtureResponse>(
      `/admin/sync-center/db/fixtures/${id}?include=homeTeam,awayTeam,league,season`
    );
  },

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
    dataQuality?: "noScores";
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
    if (params?.dataQuality)
      searchParams.append("dataQuality", params.dataQuality);

    const queryString = searchParams.toString();
    const url = `/admin/sync-center/db/fixtures${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminFixturesListResponse>(url);
  },

  async getLiveFromProvider() {
    return apiGet<AdminProviderFixturesResponse>(
      "/admin/sync-center/provider/fixtures/live"
    );
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

  async sync(dryRun = false): Promise<AdminSyncFixturesResponse> {
    return apiPost<AdminSyncFixturesResponse>(
      "/admin/sync-center/sync/fixtures",
      { dryRun }
    );
  },

  async syncFiltered(params: {
    from?: string;
    to?: string;
    seasonId?: number;
    fetchAllFixtureStates?: boolean;
    dryRun?: boolean;
  }): Promise<AdminSyncFixturesResponse> {
    return apiPost<AdminSyncFixturesResponse>(
      "/admin/sync-center/sync/fixtures",
      {
        dryRun: params.dryRun ?? false,
        fetchAllFixtureStates: params.fetchAllFixtureStates ?? true,
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.seasonId != null && { seasonId: params.seasonId }),
      }
    );
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync-center/sync/fixtures/${id}`, { dryRun });
  },

  async syncPreview(externalId: number | string) {
    return apiGet<{
      status: string;
      data: {
        fixtureName: string;
        hasChanges: boolean;
        changes: Array<{
          field: string;
          label: string;
          current: string | number | null;
          incoming: string | number | null;
        }>;
      };
    }>(`/admin/sync-center/sync/fixtures/${externalId}/preview`);
  },

  async syncPreviewBatch(externalIds: number[]) {
    return apiPost<{
      status: string;
      data: Record<string, Array<{
        field: string;
        label: string;
        current: string | number | null;
        incoming: string | number | null;
      }>>;
    }>(`/admin/sync-center/sync/fixtures/preview-batch`, { externalIds });
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
      homeScore90?: number | null;
      awayScore90?: number | null;
      homeScoreET?: number | null;
      awayScoreET?: number | null;
      penHome?: number | null;
      penAway?: number | null;
      result?: string | null;
      leg?: string | null;
    }
  ) {
    return apiPatch(`/admin/sync-center/db/fixtures/${id}`, data);
  },

  async resettle(id: number | string): Promise<AdminFixtureResettleResponse> {
    return apiPost<AdminFixtureResettleResponse>(
      `/admin/fixtures/${id}/resettle`
    );
  },

  async getGroupsSummary(
    id: number | string
  ): Promise<AdminFixtureGroupsSummaryResponse> {
    return apiGet<AdminFixtureGroupsSummaryResponse>(
      `/admin/fixtures/${id}/settlement`
    );
  },

  async getAuditLog(
    fixtureId: number | string
  ): Promise<AdminFixtureAuditLogResponse> {
    return apiGet<AdminFixtureAuditLogResponse>(
      `/admin/sync-center/db/fixtures/${fixtureId}/audit-log`
    );
  },

  async getAttention(params?: {
    issueType?: FixtureIssueType | "all";
    page?: number;
    perPage?: number;
  }): Promise<AdminFixturesAttentionResponse> {
    const searchParams = new URLSearchParams();
    if (params?.issueType) searchParams.append("issueType", params.issueType);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    const qs = searchParams.toString();
    return apiGet<AdminFixturesAttentionResponse>(
      `/admin/fixtures/attention${qs ? `?${qs}` : ""}`
    );
  },

  async search(params: {
    q: string;
    page?: number;
    perPage?: number;
  }): Promise<AdminFixtureSearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append("q", params.q);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.perPage)
      searchParams.append("perPage", params.perPage.toString());
    return apiGet<AdminFixtureSearchResponse>(
      `/admin/fixtures/search?${searchParams.toString()}`
    );
  },
};
