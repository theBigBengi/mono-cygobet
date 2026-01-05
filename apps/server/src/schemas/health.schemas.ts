// src/schemas/health.schemas.ts

export const healthResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    timestamp: { type: "string" },
  },
};
