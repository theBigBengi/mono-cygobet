// src/schemas/user-profile.schemas.ts

export const updateProfileBodySchema = {
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    username: {
      type: "string",
      minLength: 3,
      maxLength: 50,
      pattern: "^[\\u0590-\\u05FFa-zA-Z0-9_-]+$",
    },
    name: { type: "string", minLength: 1, maxLength: 100 },
    image: { anyOf: [{ type: "string", format: "uri" }, { type: "null" }] },
  },
} as const;

export const userProfileResponseSchema = {
  type: "object",
  required: ["user", "profile"],
  additionalProperties: false,
  properties: {
    user: {
      type: "object",
      required: ["id", "email", "username", "name", "image", "role"],
      additionalProperties: false,
      properties: {
        id: { type: "integer" },
        email: { type: "string" },
        username: { anyOf: [{ type: "string" }, { type: "null" }] },
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        image: { anyOf: [{ type: "string" }, { type: "null" }] },
        role: { type: "string" },
      },
    },
    profile: {
      type: "object",
      required: [
        "level",
        "dailyStreak",
        "lastClaimAt",
        "favouriteTeamId",
        "favouriteLeagueId",
        "onboardingDone",
      ],
      additionalProperties: false,
      properties: {
        level: { type: "integer" },
        dailyStreak: { type: "integer" },
        lastClaimAt: { anyOf: [{ type: "string" }, { type: "null" }] },
        favouriteTeamId: { anyOf: [{ type: "integer" }, { type: "null" }] },
        favouriteLeagueId: { anyOf: [{ type: "integer" }, { type: "null" }] },
        onboardingDone: { type: "boolean" },
      },
    },
  },
} as const;
