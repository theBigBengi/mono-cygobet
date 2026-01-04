// src/schemas/admin/bookmakers.schemas.ts
// Bookmakers admin routes schemas

export const listBookmakersQuerystringSchema = {
  type: "object",
  properties: {
    page: { type: "number", default: 1 },
    perPage: { type: "number", default: 20 },
  },
};

export const listBookmakersResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};

export const getBookmakerParamsSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
};

export const getBookmakerResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "object" },
    message: { type: "string" },
  },
};

export const getBookmaker404ResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};

export const searchBookmakersQuerystringSchema = {
  type: "object",
  properties: {
    q: { type: "string" },
    take: { type: "number", default: 10 },
  },
  required: ["q"],
};

export const searchBookmakersResponseSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    data: { type: "array", items: { type: "object" } },
    pagination: { type: "object" },
    message: { type: "string" },
  },
};


