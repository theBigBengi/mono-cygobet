import { FastifyPluginAsync } from "fastify";
import { HealthResponse } from "@repo/types/http/health";
import { prisma } from "@repo/db";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get("/health/db", async () => {
    const result = await prisma.$queryRaw`SELECT 1`;
    return { status: "db-ok", result };
  });
};

export default healthRoutes;
