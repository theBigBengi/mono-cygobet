// src/schemas/fixtures.schemas.ts
// Fixtures admin routes schemas

export const listFixturesQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
    leagueId: { type: "number" },
    leagueIds: {
      type: "array",
      items: { type: "number" },
    },
    countryIds: {
      type: "array",
      items: { type: "number" },
    },
    seasonId: { type: "number" },
    state: { type: "string" },
    include: { type: "string" },
  },
};

export const listFixturesResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};

export const getFixtureParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
};

export const getFixtureQuerystringSchema = {
  type: "object",
  properties: {
    include: { type: "string" },
  },
};

export const getFixtureResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
};

export const getFixture404ResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};

export const searchFixturesQuerystringSchema = {
  type: "object",
  properties: {
    q: { type: "string" },
    take: { type: "number", default: 10 },
  },
  required: ["q"],
};

export const searchFixturesResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};
