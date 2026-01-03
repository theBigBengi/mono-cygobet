// src/schemas/odds.schemas.ts

export const listOddsQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
    fixtureIds: { type: "string" }, // comma-separated fixture external IDs
    bookmakerIds: { type: "string" }, // comma-separated bookmaker external IDs
    marketIds: { type: "string" }, // comma-separated market external IDs
    winning: { type: "boolean" },
    fromTs: { type: "number" }, // startingAtTimestamp >= fromTs
    toTs: { type: "number" }, // startingAtTimestamp <= toTs
    include: { type: "string" },
  },
};

export const listOddsResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};

