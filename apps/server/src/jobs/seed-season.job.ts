import { prisma } from "@repo/db";
import { RunStatus, RunTrigger } from "@repo/db";
import { adapter } from "../utils/adapter";
import { startSeedBatch, finishSeedBatch } from "../etl/seeds/seed.utils";
import { seedTeams } from "../etl/seeds/seed.teams";
import { seedFixtures } from "../etl/seeds/seed.fixtures";
import { availabilityService } from "../services/availability.service";
import { getLogger } from "../logger";

const log = getLogger("SeedSeason");

export interface SeedSeasonParams {
  seasonExternalId: number;
  includeTeams: boolean;
  includeFixtures: boolean;
  dryRun: boolean;
  triggeredBy?: string | null;
  triggeredById?: string | null;
  batchId?: number;
}

export interface SeedSeasonResult {
  season: {
    id: number;
    externalId: number;
    name: string;
    league: string;
    created: boolean;
  };
  teams?: { ok: number; fail: number; total: number };
  fixtures?: { ok: number; fail: number; total: number };
  batchId: number;
}

export async function processSeedSeason(
  params: SeedSeasonParams
): Promise<SeedSeasonResult> {
  const {
    seasonExternalId,
    includeTeams,
    includeFixtures,
    dryRun,
    triggeredBy,
    triggeredById,
    batchId: existingBatchId,
  } = params;

  let batchId = existingBatchId;
  if (!batchId) {
    const batch = await startSeedBatch(
      "seed-season",
      "1.0",
      {
        seasonExternalId,
        includeTeams,
        includeFixtures,
        dryRun,
      },
      {
        trigger: RunTrigger.manual,
        triggeredBy: triggeredBy ?? null,
        triggeredById: triggeredById ?? null,
      }
    );
    batchId = batch.id;
  }

  try {
    let season = await prisma.seasons.findUnique({
      where: { externalId: BigInt(seasonExternalId) },
      include: { leagues: true },
    });

    let seasonCreated = false;

    if (!season) {
      // fetchSeasonById is the only reliable way to get a season by ID.
      // searchSeasons(name) searches by display name (e.g. "2026/2027"), not by ID.
      const providerSeason = await adapter.fetchSeasonById(seasonExternalId);
      if (!providerSeason) {
        throw new Error(
          `Season ${seasonExternalId} not found in provider. It may be finished (provider often excludes finished seasons). Use a season ID from the Sync Center availability list.`
        );
      }

      const league = await prisma.leagues.findUnique({
        where: { externalId: BigInt(providerSeason.leagueExternalId) },
      });

      if (!league) {
        throw new Error(
          `League ${providerSeason.leagueExternalId} not found in DB. Sync leagues first.`
        );
      }

      if (!dryRun) {
        season = await prisma.seasons.create({
          data: {
            externalId: BigInt(providerSeason.externalId),
            name: providerSeason.name,
            startDate: providerSeason.startDate,
            endDate: providerSeason.endDate,
            isCurrent: providerSeason.isCurrent,
            leagueId: league.id,
          },
          include: { leagues: true },
        });
        seasonCreated = true;
      }
    }

    const result: SeedSeasonResult = {
      season: {
        id: season?.id ?? 0,
        externalId: seasonExternalId,
        name: season?.name ?? "N/A (dry run)",
        league: season?.leagues?.name ?? "N/A",
        created: seasonCreated,
      },
      batchId,
    };

    if (includeTeams) {
      const fetchTeamsBySeason =
        typeof adapter.fetchTeamsBySeason === "function"
          ? adapter.fetchTeamsBySeason.bind(adapter)
          : null;
      if (!fetchTeamsBySeason) {
        throw new Error("Adapter does not support fetchTeamsBySeason");
      }
      const teamsDto = await fetchTeamsBySeason(seasonExternalId);
      const teamsResult = await seedTeams(teamsDto, {
        dryRun,
        batchId,
      });
      result.teams = {
        ok: teamsResult.ok,
        fail: teamsResult.fail,
        total: teamsResult.total,
      };
    }

    if (includeFixtures && season) {
      const fixturesDto = await adapter.fetchFixturesBySeason(seasonExternalId);
      const fixturesResult = await seedFixtures(fixturesDto, {
        dryRun,
        batchId,
      });
      result.fixtures = {
        ok: fixturesResult.ok,
        fail: fixturesResult.fail,
        total: fixturesResult.total,
      };
    }

    await finishSeedBatch(batchId, RunStatus.success, {
      meta: {
        season: result.season,
        teams: result.teams,
        fixtures: result.fixtures,
      },
    });

    await availabilityService.invalidateCache();

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error({ batchId, err: error }, "Seed season failed");
    await finishSeedBatch(batchId!, RunStatus.failed, {
      errorMessage: message.slice(0, 500),
      meta: { error: message },
    });
    throw error;
  }
}
