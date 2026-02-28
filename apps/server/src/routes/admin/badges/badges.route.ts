// src/routes/admin/badges/badges.route.ts
import type { FastifyPluginAsync } from "fastify";
import { auditFromRequest } from "../../../services/admin/audit-log.service";
import {
  listBadgeDefinitions,
  createBadgeDefinition,
  updateBadgeDefinition,
  deleteBadgeDefinition,
  searchBadgeDefinitions,
} from "../../../services/admin/badges.service";
import type {
  AdminBadgeDefinitionsListResponse,
  AdminCreateBadgeDefinitionBody,
  AdminCreateBadgeDefinitionResponse,
  AdminUpdateBadgeDefinitionBody,
  AdminUpdateBadgeDefinitionResponse,
  AdminDeleteBadgeDefinitionResponse,
  AdminBadgeDefinitionSearchResponse,
} from "@repo/types";

/**
 * Admin Badge Definitions Routes
 * ──────────────────────────────
 * Mounted under `/admin/badges` by Fastify autoload.
 * CRUD for the global badge definitions catalog.
 */
const badgesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/badges/search  (must be before /:id to avoid conflict)
  fastify.get<{
    Querystring: { q?: string };
    Reply: AdminBadgeDefinitionSearchResponse;
  }>("/search", async (req, reply) => {
    const q = req.query.q ? String(req.query.q) : "";
    const data = await searchBadgeDefinitions(q);

    return reply.send({
      status: "success",
      data,
      message: "Badge definitions search results",
    });
  });

  // GET /admin/badges
  fastify.get<{
    Querystring: { page?: number; perPage?: number; search?: string };
    Reply: AdminBadgeDefinitionsListResponse;
  }>("/", async (req, reply) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await listBadgeDefinitions(page, perPage, { search });

    return reply.send({
      status: "success",
      data: result.data,
      pagination: result.pagination,
      message: "Badge definitions fetched successfully",
    });
  });

  // POST /admin/badges
  fastify.post<{
    Body: AdminCreateBadgeDefinitionBody;
    Reply: AdminCreateBadgeDefinitionResponse;
  }>("/", async (req, reply) => {
    const data = await createBadgeDefinition(req.body);

    auditFromRequest(req, reply, {
      action: "badge-definitions.create",
      category: "badges",
      description: `Created badge definition: ${data.name} (#${data.id})`,
      targetType: "badge_definition",
      targetId: String(data.id),
    });

    return reply.code(201).send({
      status: "success",
      data,
      message: "Badge definition created successfully",
    });
  });

  // PATCH /admin/badges/:id
  fastify.patch<{
    Params: { id: string };
    Body: AdminUpdateBadgeDefinitionBody;
    Reply: AdminUpdateBadgeDefinitionResponse;
  }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const data = await updateBadgeDefinition(id, req.body);

    auditFromRequest(req, reply, {
      action: "badge-definitions.update",
      category: "badges",
      description: `Updated badge definition: ${data.name} (#${id})`,
      targetType: "badge_definition",
      targetId: String(id),
    });

    return reply.send({
      status: "success",
      data,
      message: "Badge definition updated successfully",
    });
  });

  // DELETE /admin/badges/:id
  fastify.delete<{
    Params: { id: string };
    Reply: AdminDeleteBadgeDefinitionResponse;
  }>("/:id", async (req, reply) => {
    const id = Number(req.params.id);
    await deleteBadgeDefinition(id);

    auditFromRequest(req, reply, {
      action: "badge-definitions.delete",
      category: "badges",
      description: `Deleted badge definition #${id}`,
      targetType: "badge_definition",
      targetId: String(id),
    });

    return reply.send({
      status: "success",
      message: "Badge definition deleted successfully",
    });
  });
};

export default badgesRoutes;
