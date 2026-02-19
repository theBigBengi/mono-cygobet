import { FastifyPluginAsync } from "fastify";
import { availabilityService } from "../../../../services/availability.service";
import type { AdminAvailabilityResponse } from "@repo/types";

const availabilityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { includeHistorical?: string; skipFixtureCheck?: string };
    Reply: AdminAvailabilityResponse;
  }>(
    "/availability",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            includeHistorical: { type: "string" },
            skipFixtureCheck: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", const: "ok" },
              data: {
                type: "object",
                properties: {
                  provider: { type: "string" },
                  seasons: { type: "array" },
                  summary: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      inDb: { type: "number" },
                      new: { type: "number" },
                    },
                  },
                  lastChecked: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const includeHistorical = req.query.includeHistorical === "true";
        const skipFixtureCheck = req.query.skipFixtureCheck === "true";
        const data = await availabilityService.getAvailability({
          includeHistorical,
          skipFixtureCheck,
        });
        return reply.send({ status: "ok" as const, data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Availability check failed";
        return reply
          .status(500)
          .send({
            status: "error",
            message,
          } as unknown as AdminAvailabilityResponse);
      }
    }
  );
};

export default availabilityRoutes;
