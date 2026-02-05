// src/schemas/admin/teams.schemas.ts
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

export type UpdateTeamBody = {
  name?: string;
  shortCode?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  tertiaryColor?: string | null;
};

export const updateTeamBodySchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255 },
    shortCode: { type: ["string", "null"], maxLength: 10 },
    primaryColor: {
      type: ["string", "null"],
      pattern: "^#[0-9A-Fa-f]{6}$",
      description: "Hex color code (e.g. #FF0000)",
    },
    secondaryColor: {
      type: ["string", "null"],
      pattern: "^#[0-9A-Fa-f]{6}$",
    },
    tertiaryColor: {
      type: ["string", "null"],
      pattern: "^#[0-9A-Fa-f]{6}$",
    },
  },
  additionalProperties: false,
} as const;

export const updateTeamResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: {
      type: ["object", "null"],
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        type: { type: ["string", "null"] },
        shortCode: { type: ["string", "null"] },
        imagePath: { type: ["string", "null"] },
        founded: { type: ["number", "null"] },
        countryId: { type: ["number", "null"] },
        primaryColor: { type: ["string", "null"] },
        secondaryColor: { type: ["string", "null"] },
        tertiaryColor: { type: ["string", "null"] },
        externalId: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
      },
    },
    message: { type: "string" },
  },
} as const;

export const bulkUpdateTeamsBodySchema = {
  type: "object",
  properties: {
    teams: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          primaryColor: {
            type: ["string", "null"],
            pattern: "^#[0-9A-Fa-f]{6}$",
          },
          secondaryColor: {
            type: ["string", "null"],
            pattern: "^#[0-9A-Fa-f]{6}$",
          },
          tertiaryColor: {
            type: ["string", "null"],
            pattern: "^#[0-9A-Fa-f]{6}$",
          },
        },
        required: ["name"],
      },
      minItems: 1,
      maxItems: 1000,
    },
  },
  required: ["teams"],
} as const;

export const bulkUpdateTeamsResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: {
      type: "object",
      properties: {
        updated: { type: "number" },
        notFound: { type: "array", items: { type: "string" } },
        errors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    message: { type: "string" },
  },
} as const;
