// src/schemas/teams.schemas.ts
// Teams admin routes schemas

export const listTeamsQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
    countryId: { type: "number" },
    type: { type: "string" },
    include: { type: "string" }, // e.g., "country"
  },
};

export const listTeamsResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};

export const getTeamParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
};

export const getTeamQuerystringSchema = {
  type: "object",
  properties: {
    include: { type: "string" },
  },
};

export const getTeamResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
};

export const getTeam404ResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};

export const searchTeamsQuerystringSchema = {
  type: "object",
  properties: {
    q: { type: "string" },
    take: { type: "number", default: 10 },
  },
  required: ["q"],
};

export const searchTeamsResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};

