// src/schemas/api/leagues.schemas.ts
// Schemas for leagues API endpoints.

export const leaguesQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1, minimum: 1 },
    perPage: { type: "number", default: 20, minimum: 1, maximum: 100 },
    includeSeasons: { type: "boolean", default: false },
    onlyActiveSeasons: { type: "boolean", default: false },
    preset: { type: "string", enum: ["popular"] },
    search: { type: "string", minLength: 1 },
  },
};

export const leaguesResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
          imagePath: { type: ["string", "null"] },
          countryId: { type: "number" },
          type: { type: "string" },
          shortCode: { type: ["string", "null"] },
          seasons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                name: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                isCurrent: { type: "boolean" },
                leagueId: { type: "number" },
              },
            },
          },
        },
      },
    },
    pagination: {
      type: "object",
      properties: {
        page: { type: "number" },
        perPage: { type: "number" },
        totalItems: { type: ["number", "null"] },
        totalPages: { type: ["number", "null"] },
        pageCount: { type: "number" },
        hasMore: { type: "boolean" },
      },
    },
    message: { type: "string" },
  },
};
