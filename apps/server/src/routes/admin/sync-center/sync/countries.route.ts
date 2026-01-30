// src/routes/admin/sync/countries.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { seedCountries } from "../../../../etl/seeds/seed.countries";
import { AdminSyncCountriesResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../../schemas/admin/admin.schemas";
import {
  AdvisoryLockNotAcquiredError,
  AdvisoryLockTimeoutError,
  DEFAULT_LOCK_TIMEOUT_MS,
  withAdvisoryLock,
} from "../../../../utils/advisory-lock";

const LOCK_KEY = "sync:countries";

const adminSyncCountriesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/countries - Sync countries from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncCountriesResponse;
  }>(
    "/countries",
    {
      schema: {
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
          409: { type: "object" },
          408: { type: "object" },
        },
      },
    },
    async (req, reply): Promise<AdminSyncCountriesResponse> => {
      const { dryRun = false } = req.body ?? {};
      const countriesDto = await adapter.fetchCountries();
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedCountries(countriesDto, {
              dryRun,
              triggeredBy: "admin-ui",
            });
            return reply.send({
              status: "success",
              data: {
                batchId: result.batchId,
                ok: result.ok,
                fail: result.fail,
                total: result.total,
              },
              message: dryRun
                ? "Countries sync dry-run completed"
                : "Countries synced successfully from provider to database",
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Countries sync already running",
          } as AdminSyncCountriesResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Countries sync timed out",
          } as AdminSyncCountriesResponse);
        }
        throw err;
      }
    }
  );

  // POST /admin/sync/countries/:id - Sync a single country by ID from provider to database
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncCountriesResponse;
  }>(
    "/countries/:id",
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
    async (req, reply): Promise<AdminSyncCountriesResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};
      const countryId = Number(id);
      if (isNaN(countryId)) {
        return reply.status(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Invalid country ID: ${id}`,
        });
      }
      const countryDto = await adapter.fetchCountryById(countryId);
      if (!countryDto) {
        return reply.status(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Country with ID ${countryId} not found in provider`,
        });
      }
      try {
        return await withAdvisoryLock(
          LOCK_KEY,
          async () => {
            const result = await seedCountries([countryDto], {
              dryRun,
              triggeredBy: "admin-ui",
            });
            return reply.send({
              status: "success",
              data: {
                batchId: result.batchId,
                ok: result.ok,
                fail: result.fail,
                total: result.total,
              },
              message: dryRun
                ? `Country sync dry-run completed for ID ${countryId}`
                : `Country synced successfully from provider to database (ID: ${countryId})`,
            });
          },
          { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
        );
      } catch (err) {
        if (err instanceof AdvisoryLockNotAcquiredError) {
          return reply.status(409).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Countries sync already running",
          } as AdminSyncCountriesResponse);
        }
        if (err instanceof AdvisoryLockTimeoutError) {
          return reply.status(408).send({
            status: "error",
            data: { batchId: null, ok: 0, fail: 0, total: 0 },
            message: "Countries sync timed out",
          } as AdminSyncCountriesResponse);
        }
        throw err;
      }
    }
  );
};

export default adminSyncCountriesRoutes;
