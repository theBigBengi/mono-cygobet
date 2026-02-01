// src/routes/admin/fixtures/fixtures.route.ts
// Mounted under /admin/fixtures by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import { parseId } from "../../../utils/routes";
import { getErrorMessage, getErrorProp } from "../../../utils/error.utils";
import {
  resettleFixture,
  getSettlementSummary,
} from "../../../services/admin/fixtures.service";

const adminFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/fixtures/:id/resettle - Re-settle predictions for a FT fixture
  fastify.post(
    "/:id/resettle",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              groupsAffected: { type: "number" },
              predictionsRecalculated: { type: "number" },
            },
            required: ["groupsAffected", "predictionsRecalculated"],
          },
          400: {
            type: "object",
            properties: { message: { type: "string" } },
          },
          404: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      let fixtureId: number;
      try {
        fixtureId = parseId(id);
      } catch (error: unknown) {
        return (reply as any).code(400).send({
          message: getErrorMessage(error),
        });
      }
      try {
        const result = await resettleFixture(fixtureId);
        return reply.send(result);
      } catch (error: unknown) {
        const code =
          getErrorProp<number>(error, "statusCode") ??
          getErrorProp<number>(error, "status");
        if (code === 400 || code === 404) {
          return (reply as any).code(code).send({
            message: getErrorMessage(error),
          });
        }
        throw error;
      }
    }
  );

  // GET /admin/fixtures/:id/settlement - Settlement summary for a fixture
  fastify.get(
    "/:id/settlement",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              groups: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    groupId: { type: "number" },
                    groupName: { type: "string" },
                    predictionsSettled: { type: "number" },
                  },
                  required: ["groupId", "groupName", "predictionsSettled"],
                },
              },
            },
            required: ["groups"],
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      let fixtureId: number;
      try {
        fixtureId = parseId(id);
      } catch (error: unknown) {
        return (reply as any).code(400).send({
          message: getErrorMessage(error),
        });
      }
      const summary = await getSettlementSummary(fixtureId);
      return reply.send(summary);
    }
  );
};

export default adminFixturesRoutes;
