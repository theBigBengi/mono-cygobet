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
    description: {
      type: ["string", "null"],
      maxLength: 500,
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

/** Body for POST /api/groups/:id/nudge. */
export const nudgeBodySchema = {
  type: "object",
  required: ["targetUserId", "fixtureId"],
  properties: {
    targetUserId: { type: "number", minimum: 1 },
    fixtureId: { type: "number", minimum: 1 },
  },
};

/** Response schema for POST /api/groups/:id/nudge. */
export const nudgeResponseSchema = {
  type: "object",
  required: ["status", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    message: { type: "string" },
    remaining: { type: "number" },
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

/** Query params for GET /api/groups/public. */
export const publicGroupsQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", minimum: 1 },
    perPage: { type: "number", minimum: 1, maximum: 100 },
    search: { type: "string" },
  },
};

/** Public group item in GET /api/groups/public response. */
export const publicGroupItemSchema = {
  type: "object",
  required: ["id", "name", "memberCount", "totalFixtures", "createdAt"],
  properties: {
    id: { type: "number" },
    name: { type: "string" },
    memberCount: { type: "number" },
    maxMembers: { type: ["number", "null"] },
    totalFixtures: { type: "number" },
    creatorUsername: { type: ["string", "null"] },
    createdAt: { type: "string" },
  },
};

/** Response schema for GET /api/groups/public. */
export const publicGroupsResponseSchema = {
  type: "object",
  required: ["status", "data", "pagination"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "array",
      items: publicGroupItemSchema,
    },
    pagination: {
      type: "object",
      required: ["page", "perPage", "totalItems", "totalPages"],
      properties: {
        page: { type: "number" },
        perPage: { type: "number" },
        totalItems: { type: "number" },
        totalPages: { type: "number" },
      },
    },
  },
};

export const groupItemSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    privacy: { type: "string", enum: ["private", "public"] },
    status: { type: "string", enum: ["draft", "active", "ended"] },
    creatorId: { type: "number" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    unpredictedGamesCount: { type: "integer" },
    todayGamesCount: { type: "integer" },
    todayUnpredictedCount: { type: "integer" },
    liveGamesCount: { type: "integer" },
    predictionMode: { type: "string" },
    koRoundMode: { type: "string" },
    onTheNosePoints: { type: "number" },
    correctDifferencePoints: { type: "number" },
    outcomePoints: { type: "number" },
    /** Last game of the group (latest fixture). Optional; included for active/ended and draft. */
    lastGame: { oneOf: [{ type: "object" }, { type: "null" }] },
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
    description: {
      type: "string",
      maxLength: 500,
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
  required: ["id", "username", "number", "totalPoints"],
  properties: {
    id: { type: "number" },
    username: { type: ["string", "null"] },
    number: { type: "number" },
    totalPoints: { type: "number" },
  },
};

/** Fixture item in predictions overview response. */
export const predictionsOverviewFixtureSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "homeTeam",
    "awayTeam",
    "result",
    "startTs",
    "state",
  ],
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
    liveMinute: { type: ["number", "null"] },
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
      required: ["participants", "fixtures", "predictions", "predictionPoints"],
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
        predictionPoints: {
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

/** Body schema for POST /api/groups/preview. */
export const groupPreviewBodySchema = {
  type: "object",
  required: ["selectionMode"],
  properties: {
    selectionMode: {
      type: "string",
      enum: ["games", "teams", "leagues"],
    },
    fixtureIds: {
      type: "array",
      items: { type: "number" },
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

/** Response schema for POST /api/groups/preview. */
export const groupPreviewResponseSchema = {
  type: "object",
  required: ["status", "data"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: [
        "fixtureCount",
        "leagueCount",
        "teamCount",
        "startDate",
        "endDate",
      ],
      properties: {
        fixtureCount: { type: "number" },
        leagueCount: { type: "number" },
        teamCount: { type: "number" },
        startDate: { type: ["string", "null"] },
        endDate: { type: ["string", "null"] },
      },
    },
  },
};
