// src/schemas/api/groups.schemas.ts
// Schemas for groups API endpoints.

import { MAX_MEMBERS_LIMIT } from "../../services/api/groups/constants";
import { upcomingMobileFixturesResponseSchema } from "../fixtures.schemas";

export const createGroupBodySchema = {
  type: "object",
  required: [],
  properties: {
    name: {
      type: ["string", "null"],
      minLength: 0, // Allow empty string
    },
    privacy: {
      type: "string",
      enum: ["private", "public"],
    },
    fixtureIds: {
      type: "array",
      items: { type: "number" },
    },
    selectionMode: {
      type: "string",
      enum: ["games", "teams", "leagues"],
    },
    teamIds: {
      type: "array",
      items: { type: "number" },
    },
    leagueIds: {
      type: "array",
      items: { type: "number" },
    },
  },
};

export const getGroupParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      minimum: 1,
    },
  },
};

/** Optional filter params for group fixtures (GET :id?include=fixtures, GET :id/fixtures). */
export const groupFixturesFilterQuerystringSchema = {
  type: "object",
  properties: {
    include: { type: "string", enum: ["fixtures"] },
    next: { type: "string" },
    nearestDateOnly: { type: "string" },
    leagueIds: { type: "string" },
    teamIds: { type: "string" },
    fromTs: { type: "string" },
    toTs: { type: "string" },
    states: { type: "string" },
    stages: { type: "string" },
    rounds: { type: "string" },
  },
};

export const groupItemSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    name: { type: "string" },
    privacy: { type: "string", enum: ["private", "public"] },
    status: { type: "string", enum: ["draft", "active", "ended"] },
    creatorId: { type: "number" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    predictionMode: { type: "string" },
    koRoundMode: { type: "string" },
    onTheNosePoints: { type: "number" },
    correctDifferencePoints: { type: "number" },
    outcomePoints: { type: "number" },
  },
};

export const groupResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: groupItemSchema,
    message: { type: "string" },
  },
};

export const groupsResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "array",
      items: groupItemSchema,
    },
    message: { type: "string" },
  },
};

export const groupMemberItemSchema = {
  type: "object",
  required: ["userId", "username", "role", "joinedAt"],
  properties: {
    userId: { type: "number" },
    username: { type: ["string", "null"] },
    role: { type: "string", enum: ["owner", "admin", "member"] },
    joinedAt: { type: "string" },
  },
};

export const groupMembersResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "array",
      items: groupMemberItemSchema,
    },
    message: { type: "string" },
  },
};

export const groupFixturesResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: upcomingMobileFixturesResponseSchema.properties.data,
    message: { type: "string" },
  },
};

export const saveGroupPredictionsBatchBodySchema = {
  type: "object",
  required: ["predictions"],
  properties: {
    predictions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["fixtureId", "home", "away"],
        properties: {
          fixtureId: {
            type: "number",
            minimum: 1,
          },
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
    },
  },
};

export const saveGroupPredictionsBatchResponseSchema = {
  type: "object",
  required: ["status", "message", "saved", "rejected"],
  properties: {
    status: { type: "string", enum: ["success"] },
    message: { type: "string" },
    saved: {
      type: "array",
      items: {
        type: "object",
        required: ["fixtureId"],
        properties: { fixtureId: { type: "number" } },
      },
    },
    rejected: {
      type: "array",
      items: {
        type: "object",
        required: ["fixtureId", "reason"],
        properties: {
          fixtureId: { type: "number" },
          reason: { type: "string" },
        },
      },
    },
  },
};

export const publishGroupBodySchema = {
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
    onTheNosePoints: {
      type: "number",
      minimum: 0,
    },
    correctDifferencePoints: {
      type: "number",
      minimum: 0,
    },
    outcomePoints: {
      type: "number",
      minimum: 0,
    },
    predictionMode: {
      type: "string",
    },
    koRoundMode: {
      type: "string",
    },
    inviteAccess: {
      type: "string",
      enum: ["all", "admin_only"],
    },
    maxMembers: {
      type: "number",
      minimum: 2,
      maximum: MAX_MEMBERS_LIMIT,
    },
  },
};

export const publishGroupResponseSchema = groupResponseSchema;

/** League item in GET /api/groups/:id/games-filters response. */
export const groupGamesFiltersLeagueItemSchema = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: { type: "number" },
    name: { type: "string" },
    imagePath: { type: ["string", "null"] },
    country: {
      type: ["object", "null"],
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        code: { type: "string" },
        flag: { type: ["string", "null"] },
      },
    },
  },
};

/** Filters in games-filters data. Leagues: primary "round" + rounds; teams/games: empty. */
export const groupGamesFiltersFiltersSchema = {
  oneOf: [
    {
      type: "object",
      required: ["primary", "rounds"],
      properties: {
        primary: { type: "string", enum: ["round"] },
        rounds: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ],
};

/** Response from GET /api/groups/:id/games-filters. */
export const groupGamesFiltersResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["mode", "filters", "leagues"],
      properties: {
        mode: { type: "string", enum: ["leagues", "teams", "games"] },
        filters: groupGamesFiltersFiltersSchema,
        leagues: {
          type: "array",
          items: groupGamesFiltersLeagueItemSchema,
        },
      },
    },
    message: { type: "string" },
  },
};

/** Participant item in predictions overview response. */
export const predictionsOverviewParticipantSchema = {
  type: "object",
  required: ["id", "username", "number"],
  properties: {
    id: { type: "number" },
    username: { type: ["string", "null"] },
    number: { type: "number" },
  },
};

/** Fixture item in predictions overview response. */
export const predictionsOverviewFixtureSchema = {
  type: "object",
  required: ["id", "name", "homeTeam", "awayTeam", "result", "startTs", "state"],
  properties: {
    id: { type: "number" },
    name: { type: "string" },
    homeTeam: {
      type: "object",
      required: ["id", "name", "imagePath"],
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        imagePath: { type: ["string", "null"] },
      },
    },
    awayTeam: {
      type: "object",
      required: ["id", "name", "imagePath"],
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        imagePath: { type: ["string", "null"] },
      },
    },
    result: { type: ["string", "null"] },
    startTs: { type: "number" },
    state: { type: "string" },
  },
};

/** Response from GET /api/groups/:id/predictions-overview. */
export const predictionsOverviewResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["participants", "fixtures", "predictions"],
      properties: {
        participants: {
          type: "array",
          items: predictionsOverviewParticipantSchema,
        },
        fixtures: {
          type: "array",
          items: predictionsOverviewFixtureSchema,
        },
        predictions: {
          type: "object",
          additionalProperties: {
            type: ["string", "null"],
          },
        },
      },
    },
    message: { type: "string" },
  },
};

export const joinGroupByCodeBodySchema = {
  type: "object",
  required: ["code"],
  properties: { code: { type: "string", minLength: 1 } },
};
