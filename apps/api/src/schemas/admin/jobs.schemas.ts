// src/schemas/admin/jobs.schemas.ts
// Jobs admin routes schemas (DB-backed config)

export const listJobsResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    message: { type: "string" },
  },
};

export const updateJobParamsSchema = {
  type: "object",
  properties: {
    jobId: { type: "string" },
  },
  required: ["jobId"],
};

export const updateJobBodySchema = {
  type: "object",
  properties: {
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    enabled: { type: "boolean" },
    scheduleCron: { anyOf: [{ type: "string" }, { type: "null" }] },
    meta: { type: ["object", "null"] },
  },
};

export const updateJobResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
};
