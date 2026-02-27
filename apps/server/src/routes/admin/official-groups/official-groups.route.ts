// src/routes/admin/official-groups/official-groups.route.ts
import type { FastifyPluginAsync } from "fastify";
import { auditFromRequest } from "../../../services/admin/audit-log.service";
import {
  listOfficialGroups,
  createOfficialGroup,
  getOfficialGroup,
  updateOfficialGroup,
  deleteOfficialGroup,
} from "../../../services/admin/official-groups.service";
import { evaluateGroupBadges } from "../../../services/api/groups/service/badge-evaluation";
import type {
  AdminOfficialGroupsListResponse,
  AdminCreateOfficialGroupBody,
  AdminCreateOfficialGroupResponse,
  AdminUpdateOfficialGroupBody,
  AdminUpdateOfficialGroupResponse,
  AdminDeleteOfficialGroupResponse,
  AdminAwardBadgesResponse,
} from "@repo/types";

/**
 * Admin Official Groups Routes
 * ----------------------------
 * Mounted under `/admin/official-groups` by Fastify autoload.
 */
const officialGroupsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/official-groups
  fastify.get<{
    Querystring: { page?: number; perPage?: number };
    Reply: AdminOfficialGroupsListResponse;
  }>("/", async (req, reply) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));

    const result = await listOfficialGroups(page, perPage);

    return reply.send({
      status: "success",
      data: result.data,
      pagination: result.pagination,
      message: "Official groups fetched successfully",
    });
  });

  // POST /admin/official-groups
  fastify.post<{
    Body: AdminCreateOfficialGroupBody;
    Reply: AdminCreateOfficialGroupResponse;
  }>("/", async (req, reply) => {
    const adminUserId = req.adminAuth!.user.id;
    const data = await createOfficialGroup(req.body, adminUserId);

    auditFromRequest(req, reply, {
      action: "official_groups.create",
      category: "official_groups",
      description: `Created official group: ${req.body.name}`,
      targetType: "group",
      targetId: String(data.id),
    });

    return reply.code(201).send({
      status: "success",
      data,
      message: "Official group created successfully",
    });
  });

  // GET /admin/official-groups/:id
  fastify.get<{
    Params: { id: string };
  }>("/:id", async (req, reply) => {
    const groupId = Number(req.params.id);
    const data = await getOfficialGroup(groupId);

    return reply.send({
      status: "success",
      data,
      message: "Official group fetched successfully",
    });
  });

  // PATCH /admin/official-groups/:id
  fastify.patch<{
    Params: { id: string };
    Body: AdminUpdateOfficialGroupBody;
    Reply: AdminUpdateOfficialGroupResponse;
  }>("/:id", async (req, reply) => {
    const groupId = Number(req.params.id);
    const data = await updateOfficialGroup(groupId, req.body);

    auditFromRequest(req, reply, {
      action: "official_groups.update",
      category: "official_groups",
      description: `Updated official group: ${data.name}`,
      targetType: "group",
      targetId: String(groupId),
    });

    return reply.send({
      status: "success",
      data,
      message: "Official group updated successfully",
    });
  });

  // DELETE /admin/official-groups/:id
  fastify.delete<{
    Params: { id: string };
    Reply: AdminDeleteOfficialGroupResponse;
  }>("/:id", async (req, reply) => {
    const groupId = Number(req.params.id);
    await deleteOfficialGroup(groupId);

    auditFromRequest(req, reply, {
      action: "official_groups.delete",
      category: "official_groups",
      description: `Deleted official group #${groupId}`,
      targetType: "group",
      targetId: String(groupId),
    });

    return reply.send({
      status: "success",
      message: "Official group deleted successfully",
    });
  });

  // POST /admin/official-groups/:id/award-badges
  fastify.post<{
    Params: { id: string };
    Reply: AdminAwardBadgesResponse;
  }>("/:id/award-badges", async (req, reply) => {
    const groupId = Number(req.params.id);
    const awarded = await evaluateGroupBadges(groupId);

    auditFromRequest(req, reply, {
      action: "official_groups.award_badges",
      category: "official_groups",
      description: `Awarded ${awarded} badges for official group #${groupId}`,
      targetType: "group",
      targetId: String(groupId),
    });

    return reply.send({
      status: "success",
      data: { awarded },
      message: `${awarded} badges awarded successfully`,
    });
  });
};

export default officialGroupsRoutes;
