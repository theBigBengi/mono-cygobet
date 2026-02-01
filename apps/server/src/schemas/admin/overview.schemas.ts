// Sync Center overview response schema

export const adminSyncCenterOverviewResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dbCount: { type: "number" },
              lastSyncedAt: { type: ["string", "null"] },
              lastSyncStatus: { type: ["string", "null"] },
              breakdown: { type: "object", additionalProperties: { type: "number" } },
              currentCount: { type: "number" },
            },
          },
        },
      },
    },
    message: { type: "string" },
  },
};
