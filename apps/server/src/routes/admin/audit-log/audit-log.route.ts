// src/routes/admin/audit-log/audit-log.route.ts
// Admin audit log API. Mounted under /admin/audit-log by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import {
  queryAuditLogs,
  getAuditLogFilterOptions,
} from "../../../services/admin/audit-log.service";
import type {
  AdminAuditLogListResponse,
  AdminAuditLogFilterOptionsResponse,
} from "@repo/types";

const auditLogRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/audit-log — paginated list with filters
  fastify.get<{
    Querystring: {
      search?: string;
      category?: string;
      action?: string;
      actorId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      perPage?: string;
    };
    Reply: AdminAuditLogListResponse;
  }>(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            search: { type: "string" },
            category: { type: "string" },
            action: { type: "string" },
            actorId: { type: "string" },
            dateFrom: { type: "string" },
            dateTo: { type: "string" },
            page: { type: "string" },
            perPage: { type: "string" },
          },
        },
      },
    },
    async (req, reply): Promise<AdminAuditLogListResponse> => {
      const q = req.query;
      const result = await queryAuditLogs({
        search: q.search,
        category: q.category,
        action: q.action,
        actorId: q.actorId ? parseInt(q.actorId, 10) : undefined,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        page: q.page ? parseInt(q.page, 10) : undefined,
        perPage: q.perPage ? parseInt(q.perPage, 10) : undefined,
      });

      return reply.send({
        status: "success",
        data: result.data,
        pagination: result.pagination,
        message: "OK",
      });
    }
  );

  // GET /admin/audit-log/filter-options — distinct values for dropdowns
  fastify.get<{ Reply: AdminAuditLogFilterOptionsResponse }>(
    "/filter-options",
    async (_req, reply): Promise<AdminAuditLogFilterOptionsResponse> => {
      const options = await getAuditLogFilterOptions();
      return reply.send({
        status: "success",
        data: options,
        message: "OK",
      });
    }
  );
};

export default auditLogRoutes;
