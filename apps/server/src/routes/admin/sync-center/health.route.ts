/**
 * GET /admin/sync-center/health
 * Pings the sports-data provider and returns latency + reachability.
 */
import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../utils/adapter";

const syncCenterHealthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_req, reply) => {
    const result = await adapter.healthCheck();
    return reply.send({
      status: "success",
      data: { provider: currentProviderLabel, ...result },
      message: result.reachable
        ? `Provider "${currentProviderLabel}" is reachable (${result.latencyMs}ms)`
        : `Provider "${currentProviderLabel}" is unreachable`,
    });
  });
};

export default syncCenterHealthRoute;
