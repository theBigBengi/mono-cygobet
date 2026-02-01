// GET /admin/sync-center/overview - Data overview for Sync Center (counts + last sync per entity)
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import type { AdminSyncCenterOverviewResponse } from "@repo/types";
import { adminSyncCenterOverviewResponseSchema } from "../../../schemas/admin/overview.schemas";

const SEED_NAMES = [
  "seed-countries",
  "seed-leagues",
  "seed-seasons",
  "seed-teams",
  "seed-fixtures",
  "seed-bookmakers",
] as const;

const ENTITY_NAMES = [
  "countries",
  "leagues",
  "seasons",
  "teams",
  "fixtures",
  "bookmakers",
] as const;

function mapBatchStatus(status: string): string | null {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  return null;
}

const adminSyncCenterOverviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: AdminSyncCenterOverviewResponse }>(
    "/",
    {
      schema: {
        response: {
          200: adminSyncCenterOverviewResponseSchema,
        },
      },
    },
    async (): Promise<AdminSyncCenterOverviewResponse> => {
      const [
        countriesCount,
        leaguesCount,
        seasonsCount,
        teamsCount,
        fixturesCount,
        bookmakersCount,
        batches,
        fixtureBreakdown,
        seasonsCurrentCount,
      ] = await Promise.all([
        prisma.countries.count(),
        prisma.leagues.count(),
        prisma.seasons.count(),
        prisma.teams.count(),
        prisma.fixtures.count(),
        prisma.bookmakers.count(),
        Promise.all(
          SEED_NAMES.map((name) =>
            prisma.seedBatches.findFirst({
              where: { name },
              orderBy: { startedAt: "desc" },
              select: { startedAt: true, finishedAt: true, status: true },
            })
          )
        ),
        prisma.fixtures.groupBy({
          by: ["state"],
          _count: { state: true },
        }),
        prisma.seasons.count({ where: { isCurrent: true } }),
      ]);

      const counts = [
        countriesCount,
        leaguesCount,
        seasonsCount,
        teamsCount,
        fixturesCount,
        bookmakersCount,
      ];

      const breakdownByState: Record<string, number> = {};
      for (const row of fixtureBreakdown) {
        breakdownByState[row.state] = row._count.state;
      }

      const entities = ENTITY_NAMES.map((name, i) => {
        const batch = batches[i];
        const lastSyncedAt =
          batch?.finishedAt?.toISOString() ?? batch?.startedAt?.toISOString() ?? null;
        const lastSyncStatus = batch ? mapBatchStatus(batch.status) : null;

        const entity: AdminSyncCenterOverviewResponse["data"]["entities"][number] = {
          name,
          dbCount: counts[i] ?? 0,
          lastSyncedAt,
          lastSyncStatus,
        };

        if (name === "fixtures" && Object.keys(breakdownByState).length > 0) {
          entity.breakdown = breakdownByState;
        }
        if (name === "seasons") {
          entity.currentCount = seasonsCurrentCount;
        }

        return entity;
      });

      return {
        status: "success",
        data: { entities },
        message: "Sync Center overview",
      };
    }
  );
};

export default adminSyncCenterOverviewRoutes;
