// src/services/admin/audit-log.service.ts
// Centralized admin audit logging service.

import { prisma } from "@repo/db";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../../logger";

const log = getLogger("AuditLog");

// ─── Types ───

export type AuditLogEntry = {
  actorId: number;
  actorEmail: string;
  actorName?: string | null;
  action: string;
  category: string;
  description: string;
  targetType?: string | null;
  targetId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown> | null;
  autoCapture?: boolean;
};

export type AuditFromRequestDetails = {
  action: string;
  category: string;
  description: string;
  targetType?: string | null;
  targetId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown> | null;
  /** Override actor info (e.g. for login where req.adminAuth is not yet set) */
  actor?: { id: number; email: string; name?: string | null };
};

export type AuditLogQueryFilters = {
  search?: string;
  category?: string;
  action?: string;
  actorId?: number;
  dateFrom?: string; // ISO string
  dateTo?: string; // ISO string
  page?: number;
  perPage?: number;
};

// ─── Marker to prevent double-logging ───

const AUDIT_LOGGED_KEY = Symbol("auditLogged");

export function markAsLogged(req: FastifyRequest): void {
  (req as any)[AUDIT_LOGGED_KEY] = true;
}

export function isAlreadyLogged(req: FastifyRequest): boolean {
  return !!(req as any)[AUDIT_LOGGED_KEY];
}

// ─── Core functions ───

/**
 * Fire-and-forget insert into the audit log.
 * Errors are caught and logged — never throws.
 */
export function recordAuditLog(entry: AuditLogEntry): void {
  prisma.adminAuditLog
    .create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        actorName: entry.actorName ?? null,
        action: entry.action,
        category: entry.category,
        description: entry.description,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        ipAddress: entry.ipAddress ?? null,
        changes: (entry.changes as any) ?? undefined,
        metadata: (entry.metadata as any) ?? undefined,
        autoCapture: entry.autoCapture ?? false,
      },
    })
    .catch((err) => log.error({ err }, "Failed to record audit log"));
}

/**
 * Helper that extracts actor/method/path/ip from a Fastify request
 * and records an audit log entry. Marks the request to prevent double-logging.
 */
export function auditFromRequest(
  req: FastifyRequest,
  reply: FastifyReply,
  details: AuditFromRequestDetails
): void {
  markAsLogged(req);

  const actor = details.actor ?? req.adminAuth?.user;
  if (!actor) {
    log.warn({ path: req.url, action: details.action }, "Audit log skipped: no actor");
    return;
  }

  const pathname = req.url.indexOf("?") === -1 ? req.url : req.url.slice(0, req.url.indexOf("?"));

  recordAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name ?? null,
    action: details.action,
    category: details.category,
    description: details.description,
    targetType: details.targetType ?? null,
    targetId: details.targetId ?? null,
    method: req.method,
    path: pathname,
    statusCode: reply.statusCode,
    ipAddress: req.ip ?? null,
    changes: details.changes ?? null,
    metadata: details.metadata ?? null,
  });
}

/**
 * Paginated query with filters for the admin audit log.
 */
export async function queryAuditLogs(filters: AuditLogQueryFilters) {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;

  const where: any = {};

  if (filters.category) {
    where.category = filters.category;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { description: { contains: term, mode: "insensitive" } },
      { actorEmail: { contains: term, mode: "insensitive" } },
      { actorName: { contains: term, mode: "insensitive" } },
      { action: { contains: term, mode: "insensitive" } },
      { path: { contains: term, mode: "insensitive" } },
    ];
  }

  const [data, totalItems] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    data: data.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      actorName: row.actorName,
      action: row.action,
      category: row.category,
      description: row.description,
      targetType: row.targetType,
      targetId: row.targetId,
      method: row.method,
      path: row.path,
      statusCode: row.statusCode,
      ipAddress: row.ipAddress,
      changes: row.changes as Record<string, { old: unknown; new: unknown }> | null,
      metadata: row.metadata as Record<string, unknown> | null,
      autoCapture: row.autoCapture,
    })),
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / perPage)),
    },
  };
}

/**
 * Returns distinct categories, actions, and actors for filter dropdowns.
 */
export async function getAuditLogFilterOptions() {
  const [categories, actions, actors] = await Promise.all([
    prisma.adminAuditLog
      .findMany({ select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } })
      .then((rows) => rows.map((r) => r.category)),
    prisma.adminAuditLog
      .findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } })
      .then((rows) => rows.map((r) => r.action)),
    prisma.adminAuditLog
      .findMany({
        select: { actorId: true, actorEmail: true, actorName: true },
        distinct: ["actorId"],
        orderBy: { actorEmail: "asc" },
      })
      .then((rows) =>
        rows.map((r) => ({ id: r.actorId, email: r.actorEmail, name: r.actorName }))
      ),
  ]);

  return { categories, actions, actors };
}

/**
 * Compute changes between two plain objects.
 * Returns only fields that actually changed.
 */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
