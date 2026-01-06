// src/schemas/admin/users.schemas.ts

export const listUsersQuerySchema = {
  type: "object",
  properties: {
    limit: { type: "number", minimum: 1, maximum: 100, default: 50 },
    offset: { type: "number", minimum: 0, default: 0 },
    role: { type: "string", enum: ["admin", "user"] },
    search: { type: "string", maxLength: 255 },
  },
} as const;

export const userParamsSchema = {
  type: "object",
  required: ["userId"],
  properties: {
    userId: { type: "string" },
  },
} as const;

export const createUserBodySchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 8, maxLength: 200 },
    name: { anyOf: [{ type: "string", maxLength: 255 }, { type: "null" }] },
    username: { anyOf: [{ type: "string", maxLength: 50 }, { type: "null" }] },
    role: { type: "string", enum: ["admin", "user"], default: "user" },
  },
} as const;

export const updateUserBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 8, maxLength: 200 },
    name: { anyOf: [{ type: "string", maxLength: 255 }, { type: "null" }] },
    username: { anyOf: [{ type: "string", maxLength: 50 }, { type: "null" }] },
    role: { type: "string", enum: ["admin", "user"] },
  },
} as const;

export const userResponseSchema = {
  type: "object",
  required: ["id", "email", "role", "createdAt"],
  additionalProperties: false,
  properties: {
    id: { type: "integer" },
    email: { type: "string" },
    name: { anyOf: [{ type: "string" }, { type: "null" }] },
    username: { anyOf: [{ type: "string" }, { type: "null" }] },
    role: { type: "string", enum: ["admin", "user"] },
    image: { anyOf: [{ type: "string" }, { type: "null" }] },
    createdAt: { type: "string", format: "date-time" },
    emailVerifiedAt: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
    lastLoginAt: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
  },
} as const;

export const listUsersResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["users", "total"],
      properties: {
        users: {
          type: "array",
          items: userResponseSchema,
        },
        total: { type: "number" },
      },
    },
    message: { type: "string" },
  },
} as const;

export const userDetailResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["success"] },
    data: userResponseSchema,
    message: { type: "string" },
  },
} as const;

