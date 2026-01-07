// src/schemas/user-profile.schemas.ts

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
