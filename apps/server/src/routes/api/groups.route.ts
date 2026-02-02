// src/routes/api/groups.route.ts
// Routes for groups (create, list, get).

import { FastifyPluginAsync } from "fastify";
import {
  createGroup,
  getMyGroups,
  getPublicGroups,
  getGroupById,
  getGroupGamesFilters,
  updateGroup,
  publishGroup,
  getGroupFixtures,
  saveGroupPrediction,
  saveGroupPredictionsBatch,
  deleteGroup,
  getPredictionsOverview,
  getGroupRanking,
  getGroupMembers,
  sendNudge,
  joinGroupByCode,
  joinPublicGroup,
  generateInviteCode,
  getInviteCode,
} from "../../services/api/groups";
import type { GroupFixturesFilter } from "../../types/groups";
import type {
  ApiCreateGroupBody,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiPublicGroupsQuery,
  ApiPublicGroupsResponse,
  ApiGroupFixturesResponse,
  ApiGroupGamesFiltersResponse,
  ApiSaveGroupPredictionsBatchBody,
  ApiSaveGroupPredictionsBatchResponse,
  ApiPredictionsOverviewResponse,
  ApiJoinGroupByCodeBody,
  ApiInviteCodeResponse,
  ApiNudgeBody,
  ApiNudgeResponse,
} from "@repo/types";
import {
  createGroupBodySchema,
  getGroupParamsSchema,
  groupResponseSchema,
  groupsResponseSchema,
  groupFixturesResponseSchema,
  groupFixturesFilterQuerystringSchema,
  groupGamesFiltersResponseSchema,
  saveGroupPredictionsBatchBodySchema,
  saveGroupPredictionsBatchResponseSchema,
  publishGroupBodySchema,
  publishGroupResponseSchema,
  predictionsOverviewResponseSchema,
  groupMembersResponseSchema,
  joinGroupByCodeBodySchema,
  publicGroupsQuerystringSchema,
  publicGroupsResponseSchema,
  nudgeBodySchema,
  nudgeResponseSchema,
} from "../../schemas/api";

/** Parse req.query into GroupFixturesFilter. Used only by GET :id and GET :id/fixtures. */
function parseGroupFixturesFilterFromQuery(
  q: Record<string, unknown>
): GroupFixturesFilter | undefined {
  const filter: GroupFixturesFilter = {};

  if (q.next != null) {
    const n = typeof q.next === "string" ? parseInt(q.next, 10) : Number(q.next);
    if (!isNaN(n) && n >= 1) filter.next = n;
  }
  if (q.nearestDateOnly != null) {
    const v = q.nearestDateOnly;
    filter.nearestDateOnly =
      v === true || v === "true" || v === "1" || v === 1;
  }
  if (q.leagueIds != null) {
    const arr = parseNumArray(q.leagueIds);
    if (arr.length > 0) filter.leagueIds = arr;
  }
  if (q.teamIds != null) {
    const arr = parseNumArray(q.teamIds);
    if (arr.length > 0) filter.teamIds = arr;
  }
  if (q.fromTs != null) {
    const n = typeof q.fromTs === "string" ? parseInt(q.fromTs, 10) : Number(q.fromTs);
    if (!isNaN(n)) filter.fromTs = n;
  }
  if (q.toTs != null) {
    const n = typeof q.toTs === "string" ? parseInt(q.toTs, 10) : Number(q.toTs);
    if (!isNaN(n)) filter.toTs = n;
  }
  if (q.states != null) {
    const arr = parseStringArray(q.states);
    if (arr.length > 0) filter.states = arr;
  }
  if (q.stages != null) {
    const arr = parseStringArray(q.stages);
    if (arr.length > 0) filter.stages = arr;
  }
  if (q.rounds != null) {
    const arr = parseNumArray(q.rounds);
    if (arr.length > 0) filter.rounds = arr;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

function parseNumArray(v: unknown): number[] {
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "string" ? parseInt(x, 10) : Number(x))).filter((n) => !isNaN(n));
  }
  if (typeof v === "string") {
    return v.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  }
  return [];
}

function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

const groupsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/groups
   *
   * Route mounting: This file is in routes/api/, so Fastify autoload mounts it at /api.
   * The route path "/groups" becomes "/api/groups".
   *
   * - Requires auth + onboarding completion.
   * - Creates a new group with the authenticated user as creator.
   * - Default values: status = "draft", privacy = "private" if not provided.
   */
  fastify.post<{ Body: ApiCreateGroupBody; Reply: ApiGroupResponse }>(
    "/groups",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        body: createGroupBodySchema,
        response: {
          200: groupResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const body = req.body;
      const creatorId = req.userAuth.user.id;

      const result = await createGroup({
        name: body.name,
        privacy: body.privacy,
        fixtureIds: body.fixtureIds,
        selectionMode: body.selectionMode,
        teamIds: body.teamIds,
        leagueIds: body.leagueIds,
        creatorId,
      });

      return reply.send(result);
    }
  );

  /**
   * GET /api/groups
   *
   * - Requires auth + onboarding completion.
   * - Returns all groups created by the authenticated user.
   * - Sorted by createdAt DESC.
   */
  fastify.get<{ Reply: ApiGroupsResponse }>(
    "/groups",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        response: {
          200: groupsResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const userId = req.userAuth.user.id;
      const result = await getMyGroups(userId);

      return reply.send(result);
    }
  );

  /**
   * POST /api/groups/join
   *
   * - Requires auth + onboarding completion.
   * - Joins a group by invite code. Body: { code }.
   */
  fastify.post<{
    Body: ApiJoinGroupByCodeBody;
    Reply: ApiGroupResponse;
  }>(
    "/groups/join",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        body: joinGroupByCodeBodySchema,
        response: {
          200: groupResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const userId = req.userAuth.user.id;
      const { code } = req.body;

      const result = await joinGroupByCode(code, userId, fastify.io);

      return reply.send(result);
    }
  );

  /**
   * GET /api/groups/public
   *
   * - Requires auth + onboarding completion.
   * - Returns paginated list of public active groups (excludes groups user is already in).
   * - Query: page, perPage, search (by name).
   */
  fastify.get<{
    Querystring: ApiPublicGroupsQuery;
    Reply: ApiPublicGroupsResponse;
  }>(
    "/groups/public",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        querystring: publicGroupsQuerystringSchema,
        response: {
          200: publicGroupsResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const userId = req.userAuth.user.id;
      const page = req.query.page != null ? Number(req.query.page) : undefined;
      const perPage = req.query.perPage != null ? Number(req.query.perPage) : undefined;
      const search = req.query.search;
      const result = await getPublicGroups(
        { page, perPage, search },
        userId
      );

      return reply.send(result);
    }
  );

  /**
   * GET /api/groups/:id
   *
   * - Requires auth + onboarding completion.
   * - Returns a group by ID.
   * - Verifies that the user is the creator.
   * - Returns 404 if group doesn't exist or user is not the creator.
   * - Optional ?include=fixtures plus filter params (next, nearestDateOnly, leagueIds, teamIds, fromTs, toTs, states, stages, rounds).
   */
  fastify.get<{
    Params: { id: number };
    Querystring: Record<string, unknown>;
    Reply: ApiGroupResponse;
  }>("/groups/:id", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      querystring: groupFixturesFilterQuerystringSchema,
      response: {
        200: groupResponseSchema,
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const includeFixtures = req.query.include === "fixtures";
    const filters = parseGroupFixturesFilterFromQuery(req.query as Record<string, unknown>);
    const result = await getGroupById(id, userId, includeFixtures, filters);

    return reply.send(result);
  });

  /**
   * PATCH /api/groups/:id
   *
   * - Requires auth + onboarding completion.
   * - Updates a group by ID.
   * - Verifies that the user is the creator.
   * - Only updates fields that are provided.
   * - Returns 404 if group doesn't exist or user is not the creator.
   */
  fastify.patch<{
    Params: { id: number };
    Body: ApiUpdateGroupBody;
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: getGroupParamsSchema,
        body: {
          type: "object",
          properties: {
            name: {
              type: "string",
              minLength: 1,
            },
            privacy: {
              type: "string",
              enum: ["private", "public"],
            },
            status: {
              type: "string",
              enum: ["draft", "active", "ended"],
            },
            fixtureIds: {
              type: "array",
              items: {
                type: "number",
              },
            },
            inviteAccess: {
              type: "string",
              enum: ["all", "admin_only"],
            },
          },
        },
        response: {
          200: groupResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const id = Number(req.params.id);
      const creatorId = req.userAuth.user.id;
      const body = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      const result = await updateGroup(id, {
        name: body.name,
        privacy: body.privacy,
        fixtureIds: body.fixtureIds,
        inviteAccess: body.inviteAccess,
        creatorId,
      });

      return reply.send(result);
    }
  );

  /**
   * POST /api/groups/:id/publish
   *
   * - Requires auth + onboarding completion.
   * - Publishes a group by changing status from "draft" to "active".
   * - Verifies that the user is the creator.
   * - Verifies that the group is in "draft" status.
   * - Optionally updates name and privacy during publish.
   * - Returns 404 if group doesn't exist or user is not the creator.
   * - Returns error if group is not in "draft" status.
   */
  fastify.post<{
    Params: { id: number };
    Body: ApiPublishGroupBody;
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id/publish",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: getGroupParamsSchema,
        body: publishGroupBodySchema,
        response: {
          200: publishGroupResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const id = Number(req.params.id);
      const creatorId = req.userAuth.user.id;
      const body = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      const result = await publishGroup(id, {
        name: body.name,
        privacy: body.privacy,
        onTheNosePoints: body.onTheNosePoints,
        correctDifferencePoints: body.correctDifferencePoints,
        outcomePoints: body.outcomePoints,
        predictionMode: body.predictionMode,
        koRoundMode: body.koRoundMode,
        inviteAccess: body.inviteAccess,
        maxMembers: body.maxMembers,
        creatorId,
      });

      return reply.send(result);
    }
  );

  /**
   * POST /api/groups/:id/join
   *
   * - Requires auth + onboarding completion.
   * - Joins the current user to a public group by ID.
   */
  fastify.post<{
    Params: { id: number };
    Reply: ApiGroupResponse;
  }>(
    "/groups/:id/join",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: getGroupParamsSchema,
        response: {
          200: groupResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const id = Number(req.params.id);
      const userId = req.userAuth.user.id;

      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      const result = await joinPublicGroup(id, userId, fastify.io);

      return reply.send(result);
    }
  );

  /**
   * GET /api/groups/:id/invite-code
   *
   * - Requires auth + onboarding completion.
   * - Returns the invite code for the group (creator only). Group must be active.
   */
  fastify.get<{
    Params: { id: number };
    Reply: ApiInviteCodeResponse;
  }>("/groups/:id/invite-code", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      response: {
        200: {
          type: "object",
          required: ["status", "data", "message"],
          properties: {
            status: { type: "string", enum: ["success"] },
            data: {
              type: "object",
              required: ["inviteCode"],
              properties: { inviteCode: { type: "string" } },
            },
            message: { type: "string" },
          },
        },
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const result = await getInviteCode(id, userId);

    return reply.send(result);
  });

  /**
   * POST /api/groups/:id/invite-code
   *
   * - Requires auth + onboarding completion.
   * - Generates or regenerates the invite code for the group (creator only). Group must be active.
   */
  fastify.post<{
    Params: { id: number };
    Reply: ApiInviteCodeResponse;
  }>(
    "/groups/:id/invite-code",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: getGroupParamsSchema,
        response: {
          200: {
            type: "object",
            required: ["status", "data", "message"],
            properties: {
              status: { type: "string", enum: ["success"] },
              data: {
                type: "object",
                required: ["inviteCode"],
                properties: { inviteCode: { type: "string" } },
              },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const id = Number(req.params.id);
      const userId = req.userAuth.user.id;

      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      const result = await generateInviteCode(id, userId);

      return reply.send(result);
    }
  );

  /**
   * GET /api/groups/:id/fixtures
   *
   * - Requires auth + onboarding completion.
   * - Returns fixtures attached to the given group.
   * - Verifies that the user is the creator.
   * - Optional filter params: next, nearestDateOnly, leagueIds, teamIds, fromTs, toTs, states, stages, rounds.
   */
  fastify.get<{
    Params: { id: number };
    Querystring: Record<string, unknown>;
    Reply: ApiGroupFixturesResponse;
  }>("/groups/:id/fixtures", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      querystring: groupFixturesFilterQuerystringSchema,
      response: {
        200: groupFixturesResponseSchema,
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const filters = parseGroupFixturesFilterFromQuery(req.query as Record<string, unknown>);
    const result = await getGroupFixtures(id, userId, filters);

    return reply.send(result);
  });

  /**
   * GET /api/groups/:id/games-filters
   *
   * - Requires auth + onboarding completion.
   * - Verifies that the user is a group member (creator or joined).
   * - Explicit shape: { mode, filters, leagues }. mode = selectionMode.
   * - Leagues mode: filters.primary "round" + filters.rounds (raw strings, e.g. "12", "Quarter-finals").
   * - Teams/games mode: filters {}.
   */
  fastify.get<{
    Params: { id: number };
    Reply: ApiGroupGamesFiltersResponse;
  }>("/groups/:id/games-filters", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      response: {
        200: groupGamesFiltersResponseSchema,
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const result = await getGroupGamesFilters(id, userId);
    return reply.send(result);
  });

  /**
   * PUT /api/groups/:id/predictions/:fixtureId
   *
   * - Requires auth + onboarding completion.
   * - Saves or updates a prediction for a specific fixture in a group.
   * - Verifies that the user is a group member.
   * - Verifies that the fixture belongs to the group.
   */
  fastify.put<{
    Params: { id: number; fixtureId: number };
    Body: { home: number; away: number };
    Reply: { status: "success"; message: string };
  }>(
    "/groups/:id/predictions/:fixtureId",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: {
          type: "object",
          required: ["id", "fixtureId"],
          properties: {
            id: {
              type: "number",
              minimum: 1,
            },
            fixtureId: {
              type: "number",
              minimum: 1,
            },
          },
        },
        body: {
          type: "object",
          required: ["home", "away"],
          properties: {
            home: {
              type: "number",
              minimum: 0,
              maximum: 9,
            },
            away: {
              type: "number",
              minimum: 0,
              maximum: 9,
            },
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
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const groupId = Number(req.params.id);
      const fixtureId = Number(req.params.fixtureId);
      const userId = req.userAuth.user.id;
      const { home, away } = req.body;

      if (!Number.isInteger(groupId) || groupId <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'fixtureId'. Must be a positive integer.",
        } as any);
      }

      const result = await saveGroupPrediction(groupId, fixtureId, userId, {
        home,
        away,
      });

      return reply.send(result);
    }
  );

  /**
   * PUT /api/groups/:id/predictions
   *
   * - Requires auth + onboarding completion.
   * - Saves or updates multiple predictions for fixtures in a group.
   * - Verifies that the user is a group member.
   * - Verifies that all fixtures belong to the group.
   * - Updates all predictions in a single transaction.
   */
  fastify.put<{
    Params: { id: number };
    Body: ApiSaveGroupPredictionsBatchBody;
    Reply: ApiSaveGroupPredictionsBatchResponse;
  }>(
    "/groups/:id/predictions",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: getGroupParamsSchema,
        body: saveGroupPredictionsBatchBodySchema,
        response: {
          200: saveGroupPredictionsBatchResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const groupId = Number(req.params.id);
      const userId = req.userAuth.user.id;
      const { predictions } = req.body;

      if (!Number.isInteger(groupId) || groupId <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      const result = await saveGroupPredictionsBatch(
        groupId,
        userId,
        predictions
      );

      return reply.send(result);
    }
  );

  /**
   * DELETE /api/groups/:id
   *
   * - Requires auth + onboarding completion.
   * - Deletes a group by ID.
   * - Verifies that the user is the creator.
   * - Returns 404 if group doesn't exist or user is not the creator.
   */
  fastify.delete<{
    Params: { id: number };
    Body?: Record<string, never>; // Allow empty body
    Reply: { status: "success"; message: string };
  }>(
    "/groups/:id",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        params: getGroupParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
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
      if (!req.userAuth) {
        return reply.status(401).send({
          status: "error",
          message: "Unauthorized",
        } as any);
      }

      const id = Number(req.params.id);
      const creatorId = req.userAuth.user.id;

      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'id'. Must be a positive integer.",
        } as any);
      }

      const result = await deleteGroup(id, creatorId);

      return reply.send(result);
    }
  );

  /**
   * GET /api/groups/:id/predictions-overview
   *
   * - Requires auth + onboarding completion.
   * - Verifies that the user is a group member (creator or joined).
   * - Returns predictions overview with all participants, fixtures, and predictions.
   */
  fastify.get<{
    Params: { id: number };
    Reply: ApiPredictionsOverviewResponse;
  }>("/groups/:id/predictions-overview", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      response: {
        200: predictionsOverviewResponseSchema,
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const result = await getPredictionsOverview(id, userId);

    return reply.send(result);
  });

  /**
   * GET /api/groups/:id/ranking
   *
   * - Requires auth + onboarding completion.
   * - Verifies that the user is a group member (creator or joined).
   * - Returns group ranking with all joined members and aggregated stats.
   */
  fastify.get<{ Params: { id: number } }>("/groups/:id/ranking", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const result = await getGroupRanking(id, userId);

    return reply.send(result);
  });

  /**
   * POST /api/groups/:id/nudge
   *
   * - Requires auth + onboarding completion.
   * - Verifies that the user is a group member.
   * - Sends a nudge to a member for an upcoming fixture (remind to predict).
   * - Body: { targetUserId, fixtureId }. Returns 201 on success, 409 if already nudged.
   */
  fastify.post<{ Params: { id: number }; Body: ApiNudgeBody }>("/groups/:id/nudge", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      body: nudgeBodySchema,
      response: {
        201: nudgeResponseSchema,
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;
    const body = req.body as ApiNudgeBody;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    try {
      const result = await sendNudge(id, userId, body.targetUserId, body.fixtureId);
      return reply.status(201).send(result);
    } catch (err: any) {
      if (err.status === 409) {
        return reply.status(409).send({
          status: "error",
          message: err.message || "Already nudged",
        } as any);
      }
      throw err;
    }
  });

  /**
   * GET /api/groups/:id/members
   *
   * - Requires auth + onboarding completion.
   * - Verifies that the user is a group member (creator or joined).
   * - Returns list of joined members with userId, username, role, joinedAt.
   */
  fastify.get<{ Params: { id: number } }>("/groups/:id/members", {
    preHandler: fastify.userAuth.requireOnboardingComplete,
    schema: {
      params: getGroupParamsSchema,
      response: {
        200: groupMembersResponseSchema,
      },
    },
  }, async (req, reply) => {
    if (!req.userAuth) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized",
      } as any);
    }

    const id = Number(req.params.id);
    const userId = req.userAuth.user.id;

    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid 'id'. Must be a positive integer.",
      } as any);
    }

    const result = await getGroupMembers(id, userId);

    return reply.send(result);
  });
};

export default groupsRoutes;
