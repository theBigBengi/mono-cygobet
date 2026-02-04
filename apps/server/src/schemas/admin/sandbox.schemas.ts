// src/schemas/admin/sandbox.schemas.ts
// JSON schemas for admin sandbox endpoints.

export const sandboxSetupBodySchema = {
  type: "object",
  required: ["memberUserIds", "predictionMode"],
  additionalProperties: false,
  properties: {
    selectionMode: {
      type: "string",
      enum: ["games", "leagues", "teams"],
      default: "games",
    },
    fixtureCount: { type: "integer", minimum: 1, maximum: 10 },
    leagueIds: { type: "array", items: { type: "integer" } },
    teamIds: { type: "array", items: { type: "integer" } },
    memberUserIds: {
      type: "array",
      items: { type: "integer" },
      minItems: 1,
      maxItems: 20,
    },
    predictionMode: { type: "string", enum: ["CorrectScore", "MatchWinner"] },
    autoGeneratePredictions: { type: "boolean", default: false },
    groupName: { type: "string" },
    startInMinutes: { type: "integer", minimum: 1, maximum: 10080 },
  },
} as const;

export const sandboxAddFixtureBodySchema = {
  type: "object",
  required: ["groupId", "homeTeamId", "awayTeamId"],
  additionalProperties: false,
  properties: {
    groupId: { type: "integer" },
    homeTeamId: { type: "integer" },
    awayTeamId: { type: "integer" },
    leagueId: { type: "integer" },
    round: { type: "string" },
    startInMinutes: { type: "integer", minimum: 1 },
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
  required: ["fixtureId", "homeScore90", "awayScore90"],
  additionalProperties: false,
  properties: {
    fixtureId: { type: "integer" },
    homeScore90: { type: "integer", minimum: 0 },
    awayScore90: { type: "integer", minimum: 0 },
    state: { type: "string", enum: ["FT", "AET", "FT_PEN"], default: "FT" },
    homeScoreET: { type: "integer", minimum: 0 },
    awayScoreET: { type: "integer", minimum: 0 },
    penHome: { type: "integer", minimum: 0 },
    penAway: { type: "integer", minimum: 0 },
  },
} as const;

export const sandboxUpdateLiveBodySchema = {
  type: "object",
  required: ["fixtureId"],
  additionalProperties: false,
  properties: {
    fixtureId: { type: "integer" },
    homeScore90: { type: "integer", minimum: 0 },
    awayScore90: { type: "integer", minimum: 0 },
    liveMinute: { type: "integer", minimum: 0, maximum: 120 },
    state: {
      type: "string",
      enum: [
        "INPLAY_1ST_HALF",
        "INPLAY_2ND_HALF",
        "HT",
        "INPLAY_ET",
        "INPLAY_PENALTIES",
        "BREAK",
        "EXTRA_TIME_BREAK",
        "PEN_BREAK",
      ],
    },
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

export const sandboxUpdateStartTimeBodySchema = {
  type: "object",
  required: ["fixtureId", "startTime"],
  additionalProperties: false,
  properties: {
    fixtureId: { type: "integer" },
    startTime: { type: "string", format: "date-time" },
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
