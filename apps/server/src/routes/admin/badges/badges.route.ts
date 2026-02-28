// src/routes/admin/badges/badges.route.ts
import type { FastifyPluginAsync } from "fastify";
import { auditFromRequest } from "../../../services/admin/audit-log.service";
import {
  listBadges,
  updateBadge,
  listBadgeEarned,
} from "../../../services/admin/badges.service";
import { evaluateSingleBadge } from "../../../services/api/groups/service/badge-evaluation";
import { prisma } from "@repo/db";
import type {
  AdminBadgesListResponse,
  AdminUpdateBadgeBody,
  AdminUpdateBadgeResponse,
  AdminBadgeEarnedListResponse,
  AdminAwardBadgesResponse,
} from "@repo/types";

/**
 * Admin Badges Routes
 * -------------------
 * Mounted under `/admin/badges` by Fastify autoload.
 */
const badgesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/badges
  fastify.get<{
    Querystring: {
      page?: number;
      perPage?: number;
      search?: string;
      criteriaType?: string;
      groupId?: number;
    };
    Reply: AdminBadgesListResponse;
  }>("/", async (req, reply) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));
    const search = req.query.search ? String(req.query.search) : undefined;
    const criteriaType = req.query.criteriaType
      ? String(req.query.criteriaType)
      : undefined;
    const groupId = req.query.groupId
      ? Number(req.query.groupId)
      : undefined;

    const result = await listBadges(page, perPage, {
      search,
      criteriaType,
      groupId,
    });

    return reply.send({
      status: "success",
      data: result.data,
      pagination: result.pagination,
      message: "Badges fetched successfully",
    });
  });

  // PATCH /admin/badges/:id
  fastify.patch<{
    Params: { id: string };
    Body: AdminUpdateBadgeBody;
    Reply: AdminUpdateBadgeResponse;
  }>("/:id", async (req, reply) => {
    const badgeId = Number(req.params.id);
    const data = await updateBadge(badgeId, req.body);

    auditFromRequest(req, reply, {
      action: "badges.update",
      category: "badges",
      description: `Updated badge: ${data.name} (#${badgeId})`,
      targetType: "badge",
      targetId: String(badgeId),
    });

    return reply.send({
      status: "success",
      data,
      message: "Badge updated successfully",
    });
  });

  // GET /admin/badges/:id/earned
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: number; perPage?: number };
    Reply: AdminBadgeEarnedListResponse;
  }>("/:id/earned", async (req, reply) => {
    const badgeId = Number(req.params.id);
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20));

    const result = await listBadgeEarned(badgeId, page, perPage);

    return reply.send({
      status: "success",
      data: result.data,
      pagination: result.pagination,
      message: "Earned badges fetched successfully",
    });
  });

  // POST /admin/badges/:id/award
  fastify.post<{
    Params: { id: string };
    Reply: AdminAwardBadgesResponse;
  }>("/:id/award", async (req, reply) => {
    const badgeId = Number(req.params.id);

    // Look up the badge to get its groupId
    const badge = await prisma.groupBadges.findUnique({
      where: { id: badgeId },
      select: { id: true, groupId: true, name: true },
    });

    if (!badge) {
      return reply.code(404).send({
        status: "error",
        data: { awarded: 0 },
        message: "Badge not found",
      });
    }

    const awarded = await evaluateSingleBadge(badge.groupId, badgeId);

    auditFromRequest(req, reply, {
      action: "badges.award",
      category: "badges",
      description: `Awarded badge "${badge.name}" (#${badgeId}) to ${awarded} members in group #${badge.groupId}`,
      targetType: "badge",
      targetId: String(badgeId),
    });

    return reply.send({
      status: "success",
      data: { awarded },
      message: `${awarded} badges awarded successfully`,
    });
  });
};

export default badgesRoutes;
