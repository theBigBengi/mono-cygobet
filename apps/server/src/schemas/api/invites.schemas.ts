// schemas/api/invites.schemas.ts
// Schemas for group invites API.

export const sendInviteBodySchema = {
  type: "object",
  required: ["userId"],
  properties: {
    userId: { type: "number", minimum: 1 },
    message: { type: "string", maxLength: 200 },
  },
} as const;

export const sendInviteResponseSchema = {
  type: "object",
  required: ["status", "data"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["inviteId", "expiresAt"],
      properties: {
        inviteId: { type: "number" },
        expiresAt: { type: "string" },
      },
    },
  },
} as const;

export const userInvitesQuerystringSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["pending", "accepted", "declined", "expired", "cancelled"],
    },
  },
} as const;

const inviterSchema = {
  type: "object",
  required: ["id", "username", "image"],
  properties: {
    id: { type: "number" },
    username: { type: ["string", "null"] },
    image: { type: ["string", "null"] },
  },
} as const;

const inviteItemSchema = {
  type: "object",
  required: [
    "id",
    "groupId",
    "groupName",
    "inviter",
    "message",
    "createdAt",
    "expiresAt",
  ],
  properties: {
    id: { type: "number" },
    groupId: { type: "number" },
    groupName: { type: "string" },
    inviter: inviterSchema,
    message: { type: ["string", "null"] },
    createdAt: { type: "string" },
    expiresAt: { type: "string" },
  },
} as const;

export const userInvitesResponseSchema = {
  type: "object",
  required: ["status", "data"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "object",
      required: ["invites", "pendingCount"],
      properties: {
        invites: { type: "array", items: inviteItemSchema },
        pendingCount: { type: "number" },
      },
    },
  },
} as const;

export const respondToInviteBodySchema = {
  type: "object",
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["accept", "decline"] },
  },
} as const;

/** Response for POST /api/users/invites/:inviteId/respond (accept returns data, decline does not). */
export const respondToInviteResponseSchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: { type: "object" },
    message: { type: "string" },
  },
} as const;
