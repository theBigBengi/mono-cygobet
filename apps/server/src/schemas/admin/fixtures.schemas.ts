// src/schemas/admin/fixtures.schemas.ts
// Fixtures admin routes schemas

export const listFixturesQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
    leagueId: { type: "number" },
    leagueIds: { type: "string" }, // Comma-separated string of external IDs
    countryIds: { type: "string" }, // Comma-separated string of external IDs
    seasonId: { type: "number" },
    state: { type: "string" },
    include: { type: "string" },
    fromTs: { type: "number" }, // Start timestamp filter
    toTs: { type: "number" }, // End timestamp filter
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

export const updateFixtureBodySchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    state: { type: "string" },
    homeScore90: { type: "number" },
    awayScore90: { type: "number" },
    result: { type: "string" },
  },
};

export const updateFixtureResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
};

export const updateFixture404ResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};
