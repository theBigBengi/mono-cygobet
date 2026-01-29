import { FastifyPluginAsync } from "fastify";
import { HealthResponse } from "../types/health";
import { prisma } from "@repo/db";
import { healthResponseSchema } from "../schemas/health.schemas";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (): Promise<HealthResponse> => {
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
