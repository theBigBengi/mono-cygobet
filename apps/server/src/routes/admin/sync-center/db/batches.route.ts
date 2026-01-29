// src/routes/admin/db/batches.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import {
  BatchItem,
  Batch,
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

const adminBatchesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/db/batches - List seed batches (filtered by name if provided)
  fastify.get<{
    Querystring: { name?: string; limit?: number };
    Reply: AdminBatchesListResponse;
  }>(
    "/batches",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            name: { type: "string" },
            limit: { type: "number", default: 20 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    name: { type: "string" },
                    version: { type: ["string", "null"] },
                    status: { type: "string" },
                    triggeredBy: { type: ["string", "null"] },
                    startedAt: { type: "string" },
                    finishedAt: { type: ["string", "null"] },
                    itemsTotal: { type: "number" },
                    itemsSuccess: { type: "number" },
                    itemsFailed: { type: "number" },
                  },
                },
              },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply): Promise<AdminBatchesListResponse> => {
      const { name, limit = 20 } = req.query;

      const batches = await prisma.seedBatches.findMany({
        where: name ? { name } : undefined,
        orderBy: { startedAt: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          version: true,
          status: true,
          triggeredBy: true,
          startedAt: true,
          finishedAt: true,
          itemsTotal: true,
          itemsSuccess: true,
          itemsFailed: true,
        },
      });

      return reply.send({
        status: "success",
        data: batches.map((b) => ({
          id: b.id,
          name: b.name,
          version: b.version,
          status: b.status,
          triggeredBy: b.triggeredBy,
          startedAt: b.startedAt.toISOString(),
          finishedAt: b.finishedAt?.toISOString() ?? null,
          itemsTotal: b.itemsTotal,
          itemsSuccess: b.itemsSuccess,
          itemsFailed: b.itemsFailed,
        })),
        message: "Batches fetched successfully",
      });
    }
  );

  // GET /admin/db/batches/:id/items - Get batch items with pagination
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: number; perPage?: number };
    Reply: AdminBatchItemsResponse;
  }>(
    "/batches/:id/items",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        querystring: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            perPage: { type: "number", default: 50 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    itemKey: { type: ["string", "null"] },
                    status: { type: "string" },
                    errorMessage: { type: ["string", "null"] },
                    meta: { type: "object" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  perPage: { type: "number" },
                  totalItems: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply): Promise<AdminBatchItemsResponse> => {
      const { id } = req.params;
      const { page = 1, perPage = 50 } = req.query;

      const batchId = Number(id);
      if (isNaN(batchId)) {
        return reply.status(400).send({
          status: "error",
          data: [],
          pagination: {
            page: 1,
            perPage: 50,
            totalItems: 0,
            totalPages: 0,
          },
          message: `Invalid batch ID: ${id}`,
        });
      }

      const skip = (page - 1) * perPage;
      const take = perPage;

      const [items, totalItems] = await Promise.all([
        prisma.seedItems.findMany({
          where: { batchId },
          orderBy: { id: "asc" },
          skip,
          take,
          select: {
            id: true,
            itemKey: true,
            status: true,
            errorMessage: true,
            meta: true,
          },
        }),
        prisma.seedItems.count({
          where: { batchId },
        }),
      ]);

      return reply.send({
        status: "success",
        data: items.map((item) => ({
          id: item.id,
          itemKey: item.itemKey,
          status: item.status,
          errorMessage: item.errorMessage,
          meta: item.meta as Record<string, unknown>,
        })),
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages: Math.ceil(totalItems / perPage),
        },
        message: "Batch items fetched successfully",
      });
    }
  );
};

export default adminBatchesRoutes;

