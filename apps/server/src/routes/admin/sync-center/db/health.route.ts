// src/routes/admin/db/health.route.ts
import { FastifyPluginAsync } from "fastify";
import { AdminHealthResponse } from "@repo/types";
import { prisma } from "@repo/db";
import { adminHealthResponseSchema } from "../../../../schemas/admin/health.schemas";

const adminHealthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: AdminHealthResponse }>(
    "/health",
    {
      schema: {
        response: {
          200: adminHealthResponseSchema,
        },
      },
    },
    async (): Promise<AdminHealthResponse> => {
      let dbStatus = "error";
      let dbConnected = false;

      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = "ok";
        dbConnected = true;
      } catch (error) {
        dbStatus = "error";
        dbConnected = false;
      }

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          connected: dbConnected,
        },
      };
    }
  );
};

export default adminHealthRoutes;
