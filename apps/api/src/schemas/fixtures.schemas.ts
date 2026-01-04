// src/schemas/fixtures.schemas.ts

const idSchema = {
  oneOf: [{ type: "string" }, { type: "number" }],
};

export const upcomingMobileFixturesQuerystringSchema = {
  type: "object",
  properties: {
    from: { type: "string" }, // ISO datetime
    to: { type: "string" }, // ISO datetime
    page: { type: "integer", minimum: 1, default: 1 },
    perPage: { type: "integer", minimum: 1, maximum: 200, default: 30 },
  },
};

export const upcomingMobileFixturesResponseSchema = {
  type: "object",
  required: ["status", "data", "pagination"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "kickoffAt", "league", "homeTeam", "awayTeam"],
        properties: {
          id: idSchema,
          kickoffAt: { type: "string" },
          league: {
            type: "object",
            required: ["id", "name"],
            properties: { id: idSchema, name: { type: "string" } },
          },
          homeTeam: {
            type: "object",
            required: ["id", "name"],
            properties: { id: idSchema, name: { type: "string" } },
          },
          awayTeam: {
            type: "object",
            required: ["id", "name"],
            properties: { id: idSchema, name: { type: "string" } },
          },
        },
      },
    },
    pagination: {
      type: "object",
      required: ["page", "perPage", "totalItems", "totalPages"],
      properties: {
        page: { type: "integer" },
        perPage: { type: "integer" },
        totalItems: { oneOf: [{ type: "integer" }, { type: "null" }] },
        totalPages: { oneOf: [{ type: "integer" }, { type: "null" }] },
      },
    },
  },
};


