// src/routes/admin/sync-center/sync/odds.route.ts
import { FastifyPluginAsync } from "fastify";
import { syncOdds } from "../../../../etl/sync/sync.odds";
import { adapter } from "../../../../utils/adapter";
import {
  AdvisoryLockNotAcquiredError,
  AdvisoryLockTimeoutError,
  DEFAULT_LOCK_TIMEOUT_MS,
  withAdvisoryLock,
} from "../../../../utils/advisory-lock";
import { getLogger } from "../../../../logger";
import { format, addDays, subDays } from "date-fns";
import { syncBodySchema } from "../../../../schemas/admin/admin.schemas";

const log = getLogger("SyncOddsRoute");
const LOCK_KEY = "sync:odds";

// Response shape: ok, fail, total, inserted, updated, skipped (no batchId)
const syncOddsResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: {
      type: "object",
      properties: {
        ok: { type: "number" },
        fail: { type: "number" },
        total: { type: "number" },
        inserted: { type: "number" },
        updated: { type: "number" },
        skipped: { type: "number" },
      },
    },
    message: { type: "string" },
  },
};

function parseDateOnly(value: string | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().split("T")[0]?.split(" ")[0];
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "yyyy-MM-dd");
}

function buildOddsFilters(body: {
  bookmakerIds?: string;
  marketIds?: string;
  fixtureStates?: string;
}): string | undefined {
  const parts: string[] = [];
  const bookmakerIds = body.bookmakerIds
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const marketIds = body.marketIds
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fixtureStates = body.fixtureStates
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (bookmakerIds?.length) parts.push(`bookmakers:${bookmakerIds.join(",")}`);
  if (marketIds?.length) parts.push(`markets:${marketIds.join(",")}`);
  if (fixtureStates?.length)
    parts.push(`fixtureStates:${fixtureStates.join(",")}`);
  return parts.length > 0 ? parts.join(";") : undefined;
}

const adminSyncOddsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /odds/fixture/:fixtureExternalId - Sync odds for a specific fixture (register first so path matches)
  fastify.post<{
    Params: { fixtureExternalId: string };
    Body: { dryRun?: boolean };
  }>(
    "/odds/fixture/:fixtureExternalId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            fixtureExternalId: { type: "string" },
          },
          required: ["fixtureExternalId"],
        },
        body: syncBodySchema,
        response: {
          200: syncOddsResponseSchema,
          400: { type: "object" },
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply) => {
      const { fixtureExternalId } = req.params;
      const { dryRun = false } = req.body ?? {};

      const fixtureId = Number(fixtureExternalId);
      if (Number.isNaN(fixtureId) || fixtureExternalId.trim() === "") {
        return reply.status(400).send({
          status: "error",
          data: { ok: 0, fail: 0, total: 0, inserted: 0, updated: 0, skipped: 0 },
          message: `Invalid fixture ID: ${fixtureExternalId}`,
        });
      }

      const now = new Date();
      const from = format(subDays(now, 30), "yyyy-MM-dd");
      const to = format(addDays(now, 7), "yyyy-MM-dd");
      const filters = `fixtures:${fixtureExternalId}`;

      let oddsDto: Awaited<ReturnType<typeof adapter.fetchOddsBetween>>;
      try {
        oddsDto = await adapter.fetchOddsBetween(from, to, { filters });
      } catch (err) {
        log.error({ err, fixtureExternalId, from, to }, "fetchOddsBetween failed");
        throw err;
      }

      if (dryRun) {
        return reply.send({
          status: "success",
          data: {
            ok: 0,
            fail: 0,
            total: oddsDto.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
          },
          message: `Odds sync dry-run for fixture ${fixtureExternalId}: would sync ${oddsDto.length} odds`,
        });
      }

      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await syncOdds(oddsDto, { dryRun: false });
            const ok = result.inserted + result.updated;
            return reply.send({
              status: "success",
              data: {
                ok,
                fail: result.failed,
                total: result.total,
                inserted: result.inserted,
                updated: result.updated,
                skipped: result.skipped,
              },
              message: `Synced ${result.total} odds for fixture ${fixtureExternalId} (${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped)`,
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { ok: 0, fail: 0, total: 0, inserted: 0, updated: 0, skipped: 0 },
            message: "Odds sync already running",
          });
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { ok: 0, fail: 0, total: 0, inserted: 0, updated: 0, skipped: 0 },
            message: "Odds sync timed out",
          });
        }
        throw err;
      }
    }
  );

  // POST /odds - Bulk sync odds from provider to database
  fastify.post<{
    Body: {
      dryRun?: boolean;
      from?: string;
      to?: string;
      bookmakerIds?: string;
      marketIds?: string;
      fixtureStates?: string;
    };
  }>(
    "/odds",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            dryRun: { type: "boolean" },
            from: { type: "string" },
            to: { type: "string" },
            bookmakerIds: { type: "string" },
            marketIds: { type: "string" },
            fixtureStates: { type: "string" },
          },
        },
        response: {
          200: syncOddsResponseSchema,
          400: { type: "object" },
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      const {
        dryRun = false,
        from: fromRaw,
        to: toRaw,
        bookmakerIds: _b,
        marketIds: _m,
        fixtureStates: _fs,
      } = body;

      let from: string;
      let to: string;
      if (fromRaw && toRaw) {
        const parsedFrom = parseDateOnly(fromRaw);
        const parsedTo = parseDateOnly(toRaw);
        if (!parsedFrom || !parsedTo) {
          return reply.status(400).send({
            status: "error",
            data: { ok: 0, fail: 0, total: 0, inserted: 0, updated: 0, skipped: 0 },
            message: "Invalid from/to dates; use ISO date (YYYY-MM-DD)",
          });
        }
        from = parsedFrom;
        to = parsedTo;
      } else {
        const now = new Date();
        from = format(now, "yyyy-MM-dd");
        to = format(addDays(now, 7), "yyyy-MM-dd");
      }

      const filters = buildOddsFilters(body);

      let oddsDto: Awaited<ReturnType<typeof adapter.fetchOddsBetween>>;
      try {
        oddsDto = await adapter.fetchOddsBetween(from, to, { filters });
      } catch (err) {
        log.error({ err, from, to }, "fetchOddsBetween failed");
        throw err;
      }

      if (dryRun) {
        return reply.send({
          status: "success",
          data: {
            ok: 0,
            fail: 0,
            total: oddsDto.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
          },
          message: `Odds sync dry-run: would sync ${oddsDto.length} odds`,
        });
      }

      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await syncOdds(oddsDto, { dryRun: false });
            const ok = result.inserted + result.updated;
            return reply.send({
              status: "success",
              data: {
                ok,
                fail: result.failed,
                total: result.total,
                inserted: result.inserted,
                updated: result.updated,
                skipped: result.skipped,
              },
              message: `Synced ${result.total} odds (${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped)`,
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { ok: 0, fail: 0, total: 0, inserted: 0, updated: 0, skipped: 0 },
            message: "Odds sync already running",
          });
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { ok: 0, fail: 0, total: 0, inserted: 0, updated: 0, skipped: 0 },
            message: "Odds sync timed out",
          });
        }
        throw err;
      }
    }
  );
};

export default adminSyncOddsRoutes;
