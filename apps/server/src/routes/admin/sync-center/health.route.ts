/**
 * GET /admin/sync-center/health
 * Pings the sports-data provider and returns latency + reachability.
 */
import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../utils/adapter";

const syncCenterHealthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_req, reply) => {
    const start = Date.now();
    try {
      // Use a lightweight call to test provider connectivity
      await adapter.fetchCountries();
      const latencyMs = Date.now() - start;

      return reply.send({
        status: "success",
        data: {
          provider: currentProviderLabel,
          reachable: true,
          latencyMs,
        },
        message: `Provider "${currentProviderLabel}" is reachable (${latencyMs}ms)`,
      });
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message =
        error instanceof Error ? error.message : "Unknown error";

      return reply.send({
        status: "success",
        data: {
          provider: currentProviderLabel,
          reachable: false,
          latencyMs,
          error: message,
        },
        message: `Provider "${currentProviderLabel}" is unreachable`,
      });
    }
  });
};

export default syncCenterHealthRoute;
