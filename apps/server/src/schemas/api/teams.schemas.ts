// src/schemas/api/teams.schemas.ts
// Schemas for teams API endpoints.

export const teamsQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1, minimum: 1 },
    perPage: { type: "number", default: 20, minimum: 1, maximum: 100 },
    leagueId: { type: "number", minimum: 1 },
    includeCountry: { type: "boolean", default: false },
    search: { type: "string", minLength: 1 },
    preset: { type: "string", enum: ["popular"] },
  },
};

export const teamsResponseSchema = {
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
          countryId: { type: ["number", "null"] },
          shortCode: { type: ["string", "null"] },
          country: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                properties: {
                  id: { type: "number" },
                  name: { type: "string" },
                  imagePath: { type: ["string", "null"] },
                },
              },
            ],
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
