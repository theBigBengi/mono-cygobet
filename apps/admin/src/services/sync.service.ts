import { apiGet, apiPost } from "@/lib/adminApi";
import { countriesService } from "./countries.service";
import { leaguesService } from "./leagues.service";
import { seasonsService } from "./seasons.service";
import { teamsService } from "./teams.service";
import { bookmakersService } from "./bookmakers.service";
import type {
  AdminSyncCenterOverviewResponse,
  AdminSyncFixturesResponse,
  AdminSyncCountriesResponse,
  AdminSyncLeaguesResponse,
  AdminSyncSeasonsResponse,
  AdminSyncTeamsResponse,
  AdminSyncBookmakersResponse,
  AdminAvailabilityResponse,
  AdminSeedSeasonRequest,
  AdminSeedSeasonResponse,
  AdminSeedSeasonPreviewResponse,
  AdminJobStatusResponse,
} from "@repo/types";

export interface SyncAllParams {
  dryRun?: boolean;
  from?: string;
  to?: string;
  seasonId?: number;
  fetchAllFixtureStates?: boolean;
}

export interface SyncAllResult {
  step: string;
  status: "success" | "error";
  batchId: number | null;
  ok: number;
  fail: number;
  total: number;
  error?: string;
}

export const syncService = {
  async getOverview(): Promise<AdminSyncCenterOverviewResponse> {
    return apiGet<AdminSyncCenterOverviewResponse>(
      "/admin/sync-center/overview"
    );
  },

  async getAvailability(opts?: {
    includeHistorical?: boolean;
  }): Promise<AdminAvailabilityResponse> {
    const params = new URLSearchParams();
    if (opts?.includeHistorical) {
      params.set("includeHistorical", "true");
    }
    const query = params.toString();
    return apiGet<AdminAvailabilityResponse>(
      `/admin/sync-center/provider/availability${query ? `?${query}` : ""}`
    );
  },

  async seedSeason(
    params: AdminSeedSeasonRequest
  ): Promise<AdminSeedSeasonResponse> {
    return apiPost<AdminSeedSeasonResponse>(
      "/admin/sync-center/sync/seed-season",
      params
    );
  },

  async getJobStatus(jobId: string): Promise<AdminJobStatusResponse> {
    return apiGet<AdminJobStatusResponse>(
      `/admin/sync-center/jobs/${jobId}/status`
    );
  },

  async getSeedSeasonPreview(
    seasonExternalId: number
  ): Promise<AdminSeedSeasonPreviewResponse> {
    return apiGet<AdminSeedSeasonPreviewResponse>(
      `/admin/sync-center/sync/seed-season/preview?seasonExternalId=${seasonExternalId}`
    );
  },

  async syncAll(
    params: SyncAllParams,
    onStepComplete?: (result: SyncAllResult) => void
  ): Promise<SyncAllResult[]> {
    const results: SyncAllResult[] = [];
    const { dryRun = false, from, to, seasonId } = params;

    // Step 1: Countries
    try {
      const result = (await countriesService.sync(
        dryRun
      )) as AdminSyncCountriesResponse;
      const countriesResult = {
        step: "Countries",
        status: "success" as const,
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      };
      results.push(countriesResult);
      onStepComplete?.(countriesResult);
    } catch (error) {
      results.push({
        step: "Countries",
        status: "error",
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return results; // Stop on first error
    }

    // Step 2: Leagues
    try {
      const result = (await leaguesService.sync(
        dryRun
      )) as AdminSyncLeaguesResponse;
      const leaguesResult = {
        step: "Leagues",
        status: "success" as const,
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      };
      results.push(leaguesResult);
      onStepComplete?.(leaguesResult);
    } catch (error) {
      const leaguesErrorResult = {
        step: "Leagues",
        status: "error" as const,
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      results.push(leaguesErrorResult);
      onStepComplete?.(leaguesErrorResult);
      return results;
    }

    // Step 3: Seasons
    try {
      const result = (await seasonsService.sync(
        dryRun
      )) as AdminSyncSeasonsResponse;
      const seasonsResult = {
        step: "Seasons",
        status: "success" as const,
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      };
      results.push(seasonsResult);
      onStepComplete?.(seasonsResult);
    } catch (error) {
      results.push({
        step: "Seasons",
        status: "error",
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return results;
    }

    // Step 4: Teams
    try {
      const result = (await teamsService.sync(
        dryRun
      )) as AdminSyncTeamsResponse;
      const teamsResult = {
        step: "Teams",
        status: "success" as const,
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      };
      results.push(teamsResult);
      onStepComplete?.(teamsResult);
    } catch (error) {
      const teamsErrorResult = {
        step: "Teams",
        status: "error" as const,
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      results.push(teamsErrorResult);
      onStepComplete?.(teamsErrorResult);
      return results;
    }

    // Step 5: Fixtures
    try {
      const { fetchAllFixtureStates = true } = params;
      // Fixtures sync: if seasonId or date range provided, use those; otherwise sync by all seasons in DB
      let fixturesResult;
      if (seasonId) {
        fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync-center/sync/fixtures",
          { dryRun, seasonId, fetchAllFixtureStates }
        );
      } else if (from && to) {
        fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync-center/sync/fixtures",
          { dryRun, from, to, fetchAllFixtureStates }
        );
      } else {
        fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync-center/sync/fixtures",
          { dryRun, fetchAllFixtureStates }
        );
      }
      const fixturesResultData = {
        step: "Fixtures",
        status: "success" as const,
        batchId: fixturesResult.data.batchId,
        ok: fixturesResult.data.ok,
        fail: fixturesResult.data.fail,
        total: fixturesResult.data.total,
      };
      results.push(fixturesResultData);
      onStepComplete?.(fixturesResultData);
    } catch (error) {
      const fixturesErrorResult = {
        step: "Fixtures",
        status: "error" as const,
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      results.push(fixturesErrorResult);
      onStepComplete?.(fixturesErrorResult);
    }

    // Step 6: Bookmakers (optional, doesn't block)
    try {
      const result = (await bookmakersService.sync(
        dryRun
      )) as AdminSyncBookmakersResponse;
      const bookmakersResult = {
        step: "Bookmakers",
        status: "success" as const,
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      };
      results.push(bookmakersResult);
      onStepComplete?.(bookmakersResult);
    } catch (error) {
      const bookmakersErrorResult = {
        step: "Bookmakers",
        status: "error" as const,
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      results.push(bookmakersErrorResult);
      onStepComplete?.(bookmakersErrorResult);
    }

    return results;
  },
};
