// schemas/api/user-stats.schemas.ts
// JSON Schema for user stats API endpoints.

const badgeIdEnum = [
  "sharpshooter",
  "underdog_caller",
  "streak_master",
  "group_champion",
  "consistency_king",
  "early_bird",
] as const;

const apiBadgeSchema = {
  type: "object",
  required: ["id", "name", "description", "earned", "progress"],
  properties: {
    id: { type: "string", enum: badgeIdEnum },
    name: { type: "string" },
    description: { type: "string" },
    earned: { type: "boolean" },
    progress: { type: "number" },
  },
};

const apiFormItemSchema = {
  type: "object",
  required: ["fixtureId", "points", "result"],
  properties: {
    fixtureId: { type: "number" },
    points: { type: "number" },
    result: { type: "string", enum: ["exact", "difference", "outcome", "miss"] },
  },
};

const apiUserGroupStatSchema = {
  type: "object",
  required: [
    "groupId",
    "groupName",
    "groupStatus",
    "rank",
    "totalPoints",
    "predictionCount",
    "correctScoreCount",
    "accuracy",
    "recentPoints",
  ],
  properties: {
    groupId: { type: "number" },
    groupName: { type: "string" },
    groupStatus: { type: "string" },
    rank: { type: "number" },
    totalPoints: { type: "number" },
    predictionCount: { type: "number" },
    correctScoreCount: { type: "number" },
    accuracy: { type: "number" },
    recentPoints: { type: "array", items: { type: "number" } },
  },
};

export const userStatsParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "number", minimum: 1 },
  },
};

export const userStatsResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["user", "overall", "distribution", "form", "badges", "groups"],
      properties: {
        user: {
          type: "object",
          required: ["id", "username", "image"],
          properties: {
            id: { type: "number" },
            username: { anyOf: [{ type: "string" }, { type: "null" }] },
            image: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
        overall: {
          type: "object",
          required: [
            "totalPoints",
            "totalPredictions",
            "settledPredictions",
            "exactScores",
            "accuracy",
            "groupsPlayed",
          ],
          properties: {
            totalPoints: { type: "number" },
            totalPredictions: { type: "number" },
            settledPredictions: { type: "number" },
            exactScores: { type: "number" },
            accuracy: { type: "number" },
            groupsPlayed: { type: "number" },
          },
        },
        distribution: {
          type: "object",
          required: ["exact", "difference", "outcome", "miss"],
          properties: {
            exact: { type: "number" },
            difference: { type: "number" },
            outcome: { type: "number" },
            miss: { type: "number" },
          },
        },
        form: {
          type: "array",
          items: apiFormItemSchema,
        },
        badges: {
          type: "array",
          items: apiBadgeSchema,
        },
        groups: {
          type: "array",
          items: apiUserGroupStatSchema,
        },
      },
    },
    message: { type: "string" },
  },
};

export const headToHeadParamsSchema = {
  type: "object",
  required: ["id", "opponentId"],
  properties: {
    id: { type: "number", minimum: 1 },
    opponentId: { type: "number", minimum: 1 },
  },
};

const apiHeadToHeadSharedGroupSchema = {
  type: "object",
  required: [
    "groupId",
    "groupName",
    "userRank",
    "userPoints",
    "opponentRank",
    "opponentPoints",
  ],
  properties: {
    groupId: { type: "number" },
    groupName: { type: "string" },
    userRank: { type: "number" },
    userPoints: { type: "number" },
    opponentRank: { type: "number" },
    opponentPoints: { type: "number" },
  },
};

export const headToHeadResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["user", "opponent", "sharedGroups", "summary"],
      properties: {
        user: {
          type: "object",
          required: ["id", "username"],
          properties: {
            id: { type: "number" },
            username: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
        opponent: {
          type: "object",
          required: ["id", "username"],
          properties: {
            id: { type: "number" },
            username: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
        sharedGroups: {
          type: "array",
          items: apiHeadToHeadSharedGroupSchema,
        },
        summary: {
          type: "object",
          required: [
            "userTotalPoints",
            "opponentTotalPoints",
            "userExactScores",
            "opponentExactScores",
            "userAccuracy",
            "opponentAccuracy",
            "userWins",
            "opponentWins",
            "ties",
          ],
          properties: {
            userTotalPoints: { type: "number" },
            opponentTotalPoints: { type: "number" },
            userExactScores: { type: "number" },
            opponentExactScores: { type: "number" },
            userAccuracy: { type: "number" },
            opponentAccuracy: { type: "number" },
            userWins: { type: "number" },
            opponentWins: { type: "number" },
            ties: { type: "number" },
          },
        },
      },
    },
    message: { type: "string" },
  },
};
