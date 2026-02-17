// schemas/api/users.schemas.ts
// Schemas for users search API.

export const usersSearchQuerystringSchema = {
  type: "object",
  required: ["q"],
  properties: {
    q: { type: "string", minLength: 3, maxLength: 50 },
    excludeGroupId: { type: "number", minimum: 1 },
    page: { type: "number", minimum: 1 },
    perPage: { type: "number", minimum: 1, maximum: 50 },
  },
} as const;

export const usersSearchResponseSchema = {
  type: "object",
  required: ["status", "data", "pagination"],
  properties: {
    status: { type: "string", enum: ["success"] },
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "username", "image", "isInSharedGroup"],
        properties: {
          id: { type: "number" },
          username: { type: "string" },
          image: { type: ["string", "null"] },
          isInSharedGroup: { type: "boolean" },
        },
      },
    },
    pagination: {
      type: "object",
      required: ["page", "perPage", "totalItems", "hasMore"],
      properties: {
        page: { type: "number" },
        perPage: { type: "number" },
        totalItems: { type: "number" },
        hasMore: { type: "boolean" },
      },
    },
  },
} as const;
