// src/schemas/admin/admin.schemas.ts
// Admin routes schemas

// Common pagination query string
export const paginationQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
  },
};

// Common response wrapper
export const successResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};

// Sync routes
export const syncBodySchema = {
  type: "object",
  properties: {
    dryRun: { type: "boolean" },
  },
};

export const syncResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: {
      type: "object",
      properties: {
        batchId: { type: ["number", "null"] },
        ok: { type: "number" },
        fail: { type: "number" },
        total: { type: "number" },
      },
    },
    message: { type: "string" },
  },
};

// Provider routes
export const providerResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    message: { type: "string" },
    provider: { type: "string" },
  },
};


