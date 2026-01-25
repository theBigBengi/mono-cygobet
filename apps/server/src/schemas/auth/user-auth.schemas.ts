// src/schemas/auth/user-auth.schemas.ts

export const userRegisterBodySchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    username: {
      anyOf: [
        { type: "string", minLength: 3, maxLength: 50 },
        { type: "null" },
      ],
    },
    password: { type: "string", minLength: 8, maxLength: 200 },
    name: { anyOf: [{ type: "string", maxLength: 255 }, { type: "null" }] },
  },
} as const;

export const userLoginBodySchema = {
  type: "object",
  required: ["emailOrUsername", "password"],
  additionalProperties: false,
  properties: {
    emailOrUsername: { type: "string", minLength: 1 },
    password: { type: "string", minLength: 1 },
  },
} as const;

export const userGoogleBodySchema = {
  type: "object",
  required: ["idToken"],
  additionalProperties: false,
  properties: {
    idToken: { type: "string", minLength: 1 },
  },
} as const;

export const userRefreshBodySchema = {
  type: "object",
  required: ["refreshToken"],
  additionalProperties: false,
  properties: {
    refreshToken: { type: "string", minLength: 1 },
  },
} as const;

export const userLogoutBodySchema = {
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    refreshToken: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
} as const;

export const userAuthResponseSchema = {
  type: "object",
  required: ["user", "accessToken", "refreshToken"],
  additionalProperties: false,
  properties: {
    user: {
      type: "object",
      required: ["id", "email", "username", "name"],
      additionalProperties: false,
      properties: {
        id: { type: "integer" },
        email: { type: "string" },
        username: { anyOf: [{ type: "string" }, { type: "null" }] },
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        image: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
  },
} as const;

export const userRefreshResponseSchema = {
  type: "object",
  required: ["accessToken", "refreshToken"],
  additionalProperties: false,
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
  },
} as const;

export const userLogoutResponseSchema = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["success"] },
  },
} as const;

export const userMeResponseSchema = {
  type: "object",
  required: [
    "id",
    "email",
    "username",
    "name",
    "image",
    "role",
    "onboardingRequired",
  ],
  additionalProperties: false,
  properties: {
    id: { type: "integer" },
    email: { type: "string" },
    username: { anyOf: [{ type: "string" }, { type: "null" }] },
    name: { anyOf: [{ type: "string" }, { type: "null" }] },
    image: { anyOf: [{ type: "string" }, { type: "null" }] },
    role: { type: "string" },
    onboardingRequired: { type: "boolean" },
  },
} as const;

export const userOnboardingCompleteBodySchema = {
  type: "object",
  required: ["username"],
  additionalProperties: false,
  properties: {
    username: { type: "string", minLength: 3, maxLength: 50 },
  },
} as const;

export const userOnboardingCompleteResponseSchema = {
  type: "object",
  required: ["success"],
  additionalProperties: false,
  properties: {
    success: { type: "boolean" },
  },
} as const;
