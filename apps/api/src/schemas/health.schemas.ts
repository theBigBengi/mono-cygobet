// src/schemas/health.schemas.ts

export const healthResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    timestamp: { type: "string" },
  },
};

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
  },
};

