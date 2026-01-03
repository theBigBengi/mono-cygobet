import { apiPost } from "@/lib/api";
import { countriesService } from "./countries.service";
import { leaguesService } from "./leagues.service";
import { seasonsService } from "./seasons.service";
import { teamsService } from "./teams.service";
import { fixturesService } from "./fixtures.service";
import { bookmakersService } from "./bookmakers.service";
import type {
  AdminSyncCountriesResponse,
  AdminSyncLeaguesResponse,
  AdminSyncSeasonsResponse,
  AdminSyncTeamsResponse,
  AdminSyncFixturesResponse,
  AdminSyncBookmakersResponse,
} from "@repo/types";

export interface SyncAllParams {
  dryRun?: boolean;
  from?: string;
  to?: string;
  seasonId?: number;
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
      const result = await countriesService.sync(dryRun);
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
      const result = await leaguesService.sync(dryRun);
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
      const result = await seasonsService.sync(dryRun);
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
      const result = await teamsService.sync(dryRun);
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
      // Fixtures sync needs date range or seasonId
      if (from && to) {
        const fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync/fixtures",
          { dryRun, from, to }
        );
        results.push({
          step: "Fixtures",
          status: "success",
          batchId: fixturesResult.data.batchId,
          ok: fixturesResult.data.ok,
          fail: fixturesResult.data.fail,
          total: fixturesResult.data.total,
        });
      } else if (seasonId) {
        const fixturesResult = await apiPost<AdminSyncFixturesResponse>(
          "/admin/sync/fixtures",
          { dryRun, seasonId }
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
        // Skip fixtures if no date range or seasonId provided
        results.push({
          step: "Fixtures",
          status: "error",
          batchId: null,
          ok: 0,
          fail: 0,
          total: 0,
          error: "Date range or seasonId required for fixtures sync",
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
      const result = await bookmakersService.sync(dryRun);
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

