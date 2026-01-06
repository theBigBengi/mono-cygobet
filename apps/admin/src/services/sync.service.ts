import { apiPost } from "@/lib/adminApi";
import { countriesService } from "./countries.service";
import { leaguesService } from "./leagues.service";
import { seasonsService } from "./seasons.service";
import { teamsService } from "./teams.service";
import { bookmakersService } from "./bookmakers.service";
import type {
  AdminSyncFixturesResponse,
  AdminSyncCountriesResponse,
  AdminSyncLeaguesResponse,
  AdminSyncSeasonsResponse,
  AdminSyncTeamsResponse,
  AdminSyncBookmakersResponse,
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
  async syncAll(params: SyncAllParams): Promise<SyncAllResult[]> {
    const results: SyncAllResult[] = [];
    const { dryRun = false, from, to, seasonId } = params;

    // Step 1: Countries
    try {
      const result = (await countriesService.sync(dryRun)) as AdminSyncCountriesResponse;
      results.push({
        step: "Countries",
        status: "success",
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
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
      const result = (await leaguesService.sync(dryRun)) as AdminSyncLeaguesResponse;
      results.push({
        step: "Leagues",
        status: "success",
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
    } catch (error) {
      results.push({
        step: "Leagues",
        status: "error",
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return results;
    }

    // Step 3: Seasons
    try {
      const result = (await seasonsService.sync(dryRun)) as AdminSyncSeasonsResponse;
      results.push({
        step: "Seasons",
        status: "success",
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
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
      const result = (await teamsService.sync(dryRun)) as AdminSyncTeamsResponse;
      results.push({
        step: "Teams",
        status: "success",
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
    } catch (error) {
      results.push({
        step: "Teams",
        status: "error",
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return results;
    }

    // Step 5: Fixtures
    try {
      const { fetchAllFixtureStates = true } = params;
      // Fixtures sync: if seasonId or date range provided, use those; otherwise sync by all seasons in DB
      if (seasonId) {
        const fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync-center/sync/fixtures",
          { dryRun, seasonId, fetchAllFixtureStates }
        );
        results.push({
          step: "Fixtures",
          status: "success",
          batchId: fixturesResult.data.batchId,
          ok: fixturesResult.data.ok,
          fail: fixturesResult.data.fail,
          total: fixturesResult.data.total,
        });
      } else if (from && to) {
        const fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync-center/sync/fixtures",
          { dryRun, from, to, fetchAllFixtureStates }
        );
        results.push({
          step: "Fixtures",
          status: "success",
          batchId: fixturesResult.data.batchId,
          ok: fixturesResult.data.ok,
          fail: fixturesResult.data.fail,
          total: fixturesResult.data.total,
        });
      } else {
        // Sync fixtures for all seasons in database
        const fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync-center/sync/fixtures",
          { dryRun, fetchAllFixtureStates }
        );
        results.push({
          step: "Fixtures",
          status: "success",
          batchId: fixturesResult.data.batchId,
          ok: fixturesResult.data.ok,
          fail: fixturesResult.data.fail,
          total: fixturesResult.data.total,
        });
      }
    } catch (error) {
      results.push({
        step: "Fixtures",
        status: "error",
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Step 6: Bookmakers (optional, doesn't block)
    try {
      const result = (await bookmakersService.sync(dryRun)) as AdminSyncBookmakersResponse;
      results.push({
        step: "Bookmakers",
        status: "success",
        batchId: result.data.batchId,
        ok: result.data.ok,
        fail: result.data.fail,
        total: result.data.total,
      });
    } catch (error) {
      results.push({
        step: "Bookmakers",
        status: "error",
        batchId: null,
        ok: 0,
        fail: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return results;
  },
};

