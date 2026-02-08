import { FastifyPluginAsync } from "fastify";
import { availabilityService } from "../../../../services/availability.service";
import type { AdminAvailabilityResponse } from "@repo/types";

const availabilityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: AdminAvailabilityResponse }>(
    "/availability",
    {
      schema: {
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
    async (_req, reply) => {
      try {
        const data = await availabilityService.getAvailability();
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
