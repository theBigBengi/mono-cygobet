// src/schemas/admin/leagues.schemas.ts
// Leagues admin routes schemas

export const listLeaguesQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
    countryId: { type: "number" },
    type: { type: "string" },
    include: { type: "string" }, // e.g., "country,seasons,fixtures"
  },
};

export const listLeaguesResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};

export const getLeagueParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
};

export const getLeagueQuerystringSchema = {
  type: "object",
  properties: {
    include: { type: "string" },
  },
};

export const getLeagueResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
};

export const getLeague404ResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};

export const searchLeaguesQuerystringSchema = {
  type: "object",
  properties: {
    q: { type: "string" },
    take: { type: "number", default: 10 },
  },
  required: ["q"],
};

export const searchLeaguesResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};


