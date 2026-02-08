// src/routes/api/groups-predictions.route.ts
// Routes for predictions, predictions overview, and group ranking.

import type { FastifyPluginAsync } from "fastify";
import {
  saveGroupPrediction,
  saveGroupPredictionsBatch,
  getPredictionsOverview,
  getGroupRanking,
} from "../../services/api/groups";
import type {
  ApiSaveGroupPredictionsBatchBody,
  ApiSaveGroupPredictionsBatchResponse,
  ApiPredictionsOverviewResponse,
} from "@repo/types";
import {
  getGroupParamsSchema,
  saveGroupPredictionsBatchBodySchema,
  saveGroupPredictionsBatchResponseSchema,
  predictionsOverviewResponseSchema,
} from "../../schemas/api";

const predictionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.userAuth.requireOnboardingComplete);

  // PUT /api/groups/:id/predictions/:fixtureId — save single prediction
  fastify.put<{
    Params: { id: number; fixtureId: number };
    Body: { home: number; away: number };
    Reply: { status: "success"; message: string };
  }>(
    "/groups/:id/predictions/:fixtureId",
    {
      schema: {
        params: {
          type: "object",
          required: ["id", "fixtureId"],
          properties: {
            id: { type: "number", minimum: 1 },
            fixtureId: { type: "number", minimum: 1 },
          },
        },
        body: {
          type: "object",
          required: ["home", "away"],
          properties: {
            home: { type: "number", minimum: 0, maximum: 9 },
            away: { type: "number", minimum: 0, maximum: 9 },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["status", "message"],
            properties: {
              status: { type: "string", enum: ["success"] },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const groupId = Number(req.params.id);
      const fixtureId = Number(req.params.fixtureId);
      const userId = req.userAuth!.user.id;
      const { home, away } = req.body;

      const result = await saveGroupPrediction(groupId, fixtureId, userId, {
        home,
        away,
      });

      return reply.send(result);
    }
  );

  // PUT /api/groups/:id/predictions — save multiple predictions (batch)
  fastify.put<{
    Params: { id: number };
    Body: ApiSaveGroupPredictionsBatchBody;
    Reply: ApiSaveGroupPredictionsBatchResponse;
  }>(
    "/groups/:id/predictions",
    {
      schema: {
        params: getGroupParamsSchema,
        body: saveGroupPredictionsBatchBodySchema,
        response: { 200: saveGroupPredictionsBatchResponseSchema },
      },
    },
    async (req, reply) => {
      const groupId = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const { predictions } = req.body;

      const result = await saveGroupPredictionsBatch(
        groupId,
        userId,
        predictions
      );

      return reply.send(result);
    }
  );

  // GET /api/groups/:id/predictions-overview
  fastify.get<{
    Params: { id: number };
    Reply: ApiPredictionsOverviewResponse;
  }>(
    "/groups/:id/predictions-overview",
    {
      schema: {
        params: getGroupParamsSchema,
        response: { 200: predictionsOverviewResponseSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await getPredictionsOverview(id, userId);
      return reply.send(result);
    }
  );

  // GET /api/groups/:id/ranking
  fastify.get<{ Params: { id: number } }>(
    "/groups/:id/ranking",
    {
      schema: {
        params: getGroupParamsSchema,
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.userAuth!.user.id;
      const result = await getGroupRanking(id, userId);
      return reply.send(result);
    }
  );
};

export default predictionsRoutes;
