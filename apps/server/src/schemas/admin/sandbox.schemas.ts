// src/schemas/admin/sandbox.schemas.ts
// JSON schemas for admin sandbox endpoints.

export const sandboxSetupBodySchema = {
  type: "object",
  required: ["fixtureCount", "memberUserIds", "predictionMode"],
  additionalProperties: false,
  properties: {
    fixtureCount: { type: "integer", minimum: 1, maximum: 10 },
    memberUserIds: {
      type: "array",
      items: { type: "integer" },
      minItems: 1,
      maxItems: 20,
    },
    predictionMode: { type: "string", enum: ["CorrectScore", "MatchWinner"] },
    autoGeneratePredictions: { type: "boolean", default: false },
    groupName: { type: "string" },
  },
} as const;

export const sandboxSimulateKickoffBodySchema = {
  type: "object",
  required: ["fixtureId"],
  additionalProperties: false,
  properties: {
    fixtureId: { type: "integer" },
  },
} as const;

export const sandboxSimulateFullTimeBodySchema = {
  type: "object",
  required: ["fixtureId", "homeScore", "awayScore"],
  additionalProperties: false,
  properties: {
    fixtureId: { type: "integer" },
    homeScore: { type: "integer", minimum: 0 },
    awayScore: { type: "integer", minimum: 0 },
  },
} as const;

export const sandboxResetFixtureBodySchema = {
  type: "object",
  required: ["fixtureId"],
  additionalProperties: false,
  properties: {
    fixtureId: { type: "integer" },
  },
} as const;

export const sandboxResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
} as const;
