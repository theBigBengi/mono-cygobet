// src/schemas/admin/auth.schemas.ts

export const adminLoginBodySchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    // Keep len bounds reasonable; actual strength rules can be added later.
    password: { type: "string", minLength: 8, maxLength: 200 },
  },
} as const;

export const adminAuthOkResponseSchema = {
  type: "object",
  required: ["status", "message"],
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
} as const;

export const adminMeResponseSchema = {
  type: "object",
  required: ["status", "data"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["id", "email", "role", "name"],
      additionalProperties: false,
      properties: {
        id: { type: "integer" },
        email: { type: "string" },
        role: { type: "string" },
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        lastLoginAt: {
          anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
        },
      },
    },
  },
} as const;

export const adminUpdateProfileBodySchema = {
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    name: { anyOf: [{ type: "string", maxLength: 255 }, { type: "null" }] },
  },
} as const;

export const adminChangePasswordBodySchema = {
  type: "object",
  required: ["currentPassword", "newPassword"],
  additionalProperties: false,
  properties: {
    currentPassword: { type: "string", minLength: 1 },
    newPassword: { type: "string", minLength: 8, maxLength: 200 },
  },
} as const;

export const adminUpdateProfileResponseSchema = {
  type: "object",
  required: ["status", "data", "message"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["id", "email", "role", "name"],
      additionalProperties: false,
      properties: {
        id: { type: "integer" },
        email: { type: "string" },
        role: { type: "string" },
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
    message: { type: "string" },
  },
} as const;
