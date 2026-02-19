// src/routes/admin/sync/fixtures.route.ts
import { FastifyPluginAsync } from "fastify";
import { syncFixtures } from "../../../../etl/sync/sync.fixtures";
import { adapter } from "../../../../utils/adapter";
import { availabilityService } from "../../../../services/availability.service";
import { AdminSyncFixturesResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";
import {
  AdvisoryLockNotAcquiredError,
  AdvisoryLockTimeoutError,
  DEFAULT_LOCK_TIMEOUT_MS,
  withAdvisoryLock,
} from "../../../../utils/advisory-lock";
import { transformFixtureDto } from "../../../../etl/transform/fixtures.transform";

const LOCK_KEY = "sync:fixtures";

const FIELDS_TO_COMPARE = [
  { key: "state", label: "State" },
  { key: "homeScore90", label: "Home Score (90')" },
  { key: "awayScore90", label: "Away Score (90')" },
  { key: "result", label: "Result" },
  { key: "homeScoreET", label: "Home Score (ET)" },
  { key: "awayScoreET", label: "Away Score (ET)" },
  { key: "penHome", label: "Penalties (Home)" },
  { key: "penAway", label: "Penalties (Away)" },
  { key: "liveMinute", label: "Live Minute" },
  { key: "startIso", label: "Start Time" },
  { key: "name", label: "Name" },
] as const;

const DB_FIXTURE_SELECT = {
  state: true,
  result: true,
  homeScore90: true,
  awayScore90: true,
  homeScoreET: true,
  awayScoreET: true,
  penHome: true,
  penAway: true,
  liveMinute: true,
  startIso: true,
  name: true,
} as const;

type SyncPreviewChange = {
  field: string;
  label: string;
  current: string | number | null;
  incoming: string | number | null;
};

function computeChanges(
  dbFixture: Record<string, unknown>,
  incoming: Record<string, unknown>
): SyncPreviewChange[] {
  const changes: SyncPreviewChange[] = [];
  for (const { key, label } of FIELDS_TO_COMPARE) {
    const current = (dbFixture[key] as string | number | null) ?? null;
    const next = (incoming[key] as string | number | null) ?? null;
    if (String(current) !== String(next)) {
      changes.push({ field: key, label, current, incoming: next });
    }
  }
  return changes;
}

const adminSyncFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/fixtures - Sync fixtures from provider to database
  // Requires date range or seasonId in body
  fastify.post<{
    Body: {
      dryRun?: boolean;
      from?: string;
      to?: string;
      seasonId?: number;
      fetchAllFixtureStates?: boolean;
    };
    Reply: AdminSyncFixturesResponse;
  }>(
    "/fixtures",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            dryRun: { type: "boolean" },
            from: { type: "string" },
            to: { type: "string" },
            seasonId: { type: "number" },
            fetchAllFixtureStates: { type: "boolean" },
          },
        },
        response: {
          200: syncResponseSchema,
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminSyncFixturesResponse> => {
      const {
        dryRun = false,
        from,
        to,
        seasonId,
        fetchAllFixtureStates = true,
      } = req.body ?? {};

      // All fetches outside the lock (no API time under lock)
      let batchesToSync: { fixturesDto: any[] }[] = [];
      let dbSeasonsCount = 0;

      if (seasonId) {
        const fixturesDto = await adapter.fetchFixturesBySeason(seasonId, {
          fixtureStates: fetchAllFixtureStates ? undefined : "1",
        });
        batchesToSync = [{ fixturesDto }];
      } else if (from && to) {
        const fixturesDto = await adapter.fetchFixturesBetween(from, to, {
          filters: fetchAllFixtureStates ? undefined : { fixtureStates: "1" },
        });
        batchesToSync = [{ fixturesDto }];
      } else {
        const dbSeasons = await prisma.seasons.findMany({
          select: { externalId: true },
          orderBy: { name: "asc" },
        });
        dbSeasonsCount = dbSeasons.length;

        if (dbSeasons.length === 0) {
          return reply.code(400).send({
            status: "error",
            data: {
              batchId: null,
              ok: 0,
              fail: 0,
              total: 0,
            },
            message: "No seasons found in database. Please sync seasons first.",
          });
        }

        for (const season of dbSeasons) {
          try {
            const fixturesDto = await adapter.fetchFixturesBySeason(
              Number(season.externalId),
              {
                fixtureStates: fetchAllFixtureStates ? undefined : "1",
              }
            );
            if (fixturesDto.length > 0) {
              batchesToSync.push({ fixturesDto });
            }
          } catch {
            // Continue with other seasons; we'll still sync what we have
          }
        }
      }

      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            let totalOk = 0;
            let totalFail = 0;
            let totalTotal = 0;
            let firstErrorSeen: string | undefined;

            if (batchesToSync.length === 1 && !dbSeasonsCount) {
              const batch = batchesToSync[0]!;
              const result = await syncFixtures(batch.fixturesDto, {
                dryRun,
              });
              await availabilityService.invalidateCache().catch(() => {});
              const ok = result.inserted + result.updated;
              return reply.send({
                status: "success",
                data: {
                  batchId: null,
                  ok,
                  fail: result.failed,
                  total: result.total,
                  ...(result.failed > 0 && {
                    firstError: "One or more fixtures failed to sync",
                  }),
                },
                message: dryRun
                  ? "Fixtures sync dry-run completed"
                  : "Fixtures synced successfully from provider to database",
              });
            }

            for (const { fixturesDto } of batchesToSync) {
              if (fixturesDto.length === 0) continue;
              try {
                const result = await syncFixtures(fixturesDto, {
                  dryRun,
                });
                const ok = result.inserted + result.updated;
                totalOk += ok;
                totalFail += result.failed;
                totalTotal += result.total;
                if (result.failed > 0 && firstErrorSeen === undefined) {
                  firstErrorSeen = "One or more fixtures failed to sync";
                }
              } catch (error) {
                totalFail += 1;
                totalTotal += 1;
                if (firstErrorSeen === undefined && error instanceof Error) {
                  firstErrorSeen = error.message;
                }
              }
            }

            await availabilityService.invalidateCache().catch(() => {});

            return reply.send({
              status: "success",
              data: {
                batchId: null,
                ok: totalOk,
                fail: totalFail,
                total: totalTotal,
                ...(totalFail > 0 &&
                  firstErrorSeen && { firstError: firstErrorSeen }),
              },
              message: dryRun
                ? `Fixtures sync dry-run completed for ${dbSeasonsCount || batchesToSync.length} seasons`
                : `Fixtures synced successfully from provider to database for ${dbSeasonsCount || batchesToSync.length} seasons`,
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Fixtures sync already running",
          } as AdminSyncFixturesResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Fixtures sync timed out",
          } as AdminSyncFixturesResponse);
        }
        throw err;
      }
    }
  );

  // GET /admin/sync/fixtures/:id/preview - Preview what a sync would change
  fastify.get<{ Params: { id: string } }>(
    "/fixtures/:id/preview",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      },
    },
    async (req, reply) => {
      const fixtureId = Number(req.params.id);
      if (isNaN(fixtureId)) {
        return reply.status(400).send({ status: "error", message: "Invalid fixture ID" });
      }

      const dbFixture = await prisma.fixtures.findFirst({
        where: { externalId: fixtureId },
        select: DB_FIXTURE_SELECT,
      });
      if (!dbFixture) {
        return reply.status(404).send({ status: "error", message: "Fixture not found in DB" });
      }

      const providerDto = await adapter.fetchFixtureById(fixtureId);
      if (!providerDto) {
        return reply.status(404).send({ status: "error", message: "Fixture not found in provider" });
      }

      const incoming = transformFixtureDto(providerDto);
      const changes = computeChanges(dbFixture as Record<string, unknown>, incoming as Record<string, unknown>);

      return reply.send({
        status: "success",
        data: { fixtureName: dbFixture.name, changes, hasChanges: changes.length > 0 },
      });
    }
  );

  // POST /admin/sync/fixtures/preview-batch - Preview changes for multiple fixtures at once
  fastify.post<{ Body: { externalIds: number[] } }>(
    "/fixtures/preview-batch",
    {
      schema: {
        body: {
          type: "object",
          properties: { externalIds: { type: "array", items: { type: "number" }, maxItems: 50 } },
          required: ["externalIds"],
        },
      },
    },
    async (req, reply) => {
      const { externalIds } = req.body;
      if (!externalIds?.length) {
        return reply.send({ status: "success", data: {} });
      }

      // Fetch all DB fixtures in one query
      const dbFixtures = await prisma.fixtures.findMany({
        where: { externalId: { in: externalIds } },
        select: { externalId: true, ...DB_FIXTURE_SELECT },
      });
      const dbMap = new Map(dbFixtures.map((f) => [Number(f.externalId), f]));

      // Fetch all from provider in ONE call using fetchFixturesByIds
      const providerDtos = await adapter.fetchFixturesByIds(externalIds, {
        includeScores: true,
      });
      const providerMap = new Map(providerDtos.map((dto) => [dto.externalId, dto]));

      // Compare each fixture
      const results: Record<string, SyncPreviewChange[]> = {};
      for (const extId of externalIds) {
        const dbFixture = dbMap.get(extId);
        const providerDto = providerMap.get(extId);

        if (!dbFixture || !providerDto) {
          results[String(extId)] = [];
          continue;
        }

        const incoming = transformFixtureDto(providerDto);
        results[String(extId)] = computeChanges(
          dbFixture as unknown as Record<string, unknown>,
          incoming as Record<string, unknown>
        );
      }

      return reply.send({ status: "success", data: results });
    }
  );

  // POST /admin/sync/fixtures/:id - Sync a single fixture by ID from provider to database
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncFixturesResponse;
  }>(
    "/fixtures/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminSyncFixturesResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};

      const fixtureId = Number(id);
      if (isNaN(fixtureId)) {
        return reply.status(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Invalid fixture ID: ${id}`,
        });
      }

      const fixtureDto = await adapter.fetchFixtureById(fixtureId);
      if (!fixtureDto) {
        return reply.code(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Fixture with ID ${fixtureId} not found in provider`,
        });
      }

      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await syncFixtures([fixtureDto], {
              dryRun,
              bypassStateValidation: !dryRun,
            });
            await availabilityService.invalidateCache().catch(() => {});
            const ok = result.inserted + result.updated;
            return reply.send({
              status: "success",
              data: {
                batchId: null,
                ok,
                fail: result.failed,
                total: result.total,
                ...(result.failed > 0 && {
                  firstError: "Fixture failed to sync",
                }),
              },
              message: dryRun
                ? `Fixture sync dry-run completed for ID ${fixtureId}`
                : `Fixture synced successfully from provider to database (ID: ${fixtureId})`,
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Fixtures sync already running",
          } as AdminSyncFixturesResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Fixtures sync timed out",
          } as AdminSyncFixturesResponse);
        }
        throw err;
      }
    }
  );
};

export default adminSyncFixturesRoutes;
