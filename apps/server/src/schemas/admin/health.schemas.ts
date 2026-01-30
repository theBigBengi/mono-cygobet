// src/schemas/admin/health.schemas.ts

export const adminHealthResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    timestamp: { type: "string" },
    database: {
      type: "object",
      properties: {
        status: { type: "string" },
        connected: { type: "boolean" },
      },
    },
    adapter: { type: "object" },
  },
};


