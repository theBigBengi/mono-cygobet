// src/schemas/api/groups.schemas.ts
// Schemas for groups API endpoints.

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
  required: ["status", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    message: { type: "string" },
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
  },
};

export const publishGroupResponseSchema = groupResponseSchema;
