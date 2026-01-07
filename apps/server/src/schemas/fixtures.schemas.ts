// src/schemas/fixtures.schemas.ts

const idSchema = { type: "integer" };

/**
 * Minimal schema for PUBLIC upcoming fixtures endpoint.
 * Only supports pagination and optional days parameter.
 * No filters (leagues, markets, include, etc.) to keep contract minimal.
 *
 * Validation behavior:
 * - `additionalProperties: false` ensures unknown query params (e.g., ?foo=1) return 400.
 * - Fastify automatically validates querystring and returns 400 on validation failure.
 */
export const publicUpcomingFixturesQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    perPage: { type: "integer", minimum: 1, maximum: 50, default: 20 },
    days: { type: "integer", minimum: 1, maximum: 5, default: 5 },
  },
  additionalProperties: false, // Strict: reject unknown params (returns 400)
};

/**
 * Full schema for PROTECTED upcoming fixtures endpoint.
 * Supports flexible from/to dates and all filters.
 */
export const upcomingMobileFixturesQuerystringSchema = {
  type: "object",
  properties: {
    // Accept ISO datetime string OR unix seconds/millis (number or numeric string).
    from: { anyOf: [{ type: "string" }, { type: "number" }] },
    to: { anyOf: [{ type: "string" }, { type: "number" }] },
    leagues: {
      anyOf: [
        { type: "string" }, // "1,2,3"
        { type: "number" },
        {
          type: "array",
          items: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
      ],
    },
    markets: {
      anyOf: [
        { type: "string" }, // "1,2,3"
        { type: "number" },
        {
          type: "array",
          items: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
      ],
    },
    hasOdds: { type: "boolean", default: false },
    include: {
      anyOf: [
        { type: "string" }, // "odds,country"
        { type: "array", items: { type: "string" } },
      ],
    },
    page: { type: "integer", minimum: 1, default: 1 },
    perPage: { type: "integer", minimum: 1, maximum: 50, default: 20 },
  },
};

export const upcomingMobileFixturesResponseSchema = {
  type: "object",
  required: ["status", "data", "pagination", "message"],
  properties: {
    status: { type: "string", enum: ["success"] },
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "name",
          "kickoffAt",
          "startTs",
          "state",
          "stage",
          "round",
        ],
        properties: {
          id: idSchema,
          name: { type: "string" },
          kickoffAt: { type: "string" },
          startTs: { type: "integer" },
          state: { type: "string" },
          stage: { anyOf: [{ type: "string" }, { type: "null" }] },
          round: { anyOf: [{ type: "string" }, { type: "null" }] },
          league: {
            type: "object",
            required: ["id", "name"],
            properties: {
              id: idSchema,
              name: { type: "string" },
              imagePath: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
          },
          country: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                required: ["id", "name", "imagePath"],
                properties: {
                  id: idSchema,
                  name: { type: "string" },
                  imagePath: { anyOf: [{ type: "string" }, { type: "null" }] },
                },
              },
            ],
          },
          homeTeam: {
            type: "object",
            required: ["id", "name"],
            properties: {
              id: idSchema,
              name: { type: "string" },
              imagePath: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
          },
          awayTeam: {
            type: "object",
            required: ["id", "name"],
            properties: {
              id: idSchema,
              name: { type: "string" },
              imagePath: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
          },
          odds: {
            type: "array",
            items: {
              type: "object",
              required: [
                "id",
                "value",
                "label",
                "marketName",
                "probability",
                "winning",
                "name",
                "handicap",
                "total",
                "sortOrder",
              ],
              properties: {
                id: idSchema,
                value: { type: "string" },
                label: { type: "string" },
                marketName: { type: "string" },
                probability: { anyOf: [{ type: "string" }, { type: "null" }] },
                winning: { type: "boolean" },
                name: { anyOf: [{ type: "string" }, { type: "null" }] },
                handicap: { anyOf: [{ type: "string" }, { type: "null" }] },
                total: { anyOf: [{ type: "string" }, { type: "null" }] },
                sortOrder: { type: "integer" },
              },
            },
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
