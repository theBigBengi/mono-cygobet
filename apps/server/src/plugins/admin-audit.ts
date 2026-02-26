// src/plugins/admin-audit.ts
// Safety-net: auto-log any non-GET admin mutation that wasn't explicitly logged.

import fp from "fastify-plugin";
import { isAlreadyLogged, recordAuditLog } from "../services/admin/audit-log.service";

const SKIP_PATHS = new Set(["/admin/auth/login", "/admin/auth/logout"]);

/** Infer category from URL path segment. */
function inferCategory(path: string): string {
  if (path.includes("/jobs")) return "jobs";
  if (path.includes("/sync") || path.includes("/seed-season") || path.includes("/batch-seed")) return "sync";
  if (path.includes("/fixtures") || path.includes("/db/fixtures")) return "fixtures";
  if (path.includes("/settings")) return "settings";
  if (path.includes("/users")) return "users";
  if (path.includes("/sandbox")) return "sandbox";
  if (path.includes("/alerts")) return "alerts";
  if (path.includes("/auth")) return "auth";
  if (path.includes("/audit-log")) return "system";
  return "other";
}

export default fp(async function adminAuditPlugin(fastify) {
  fastify.addHook("onResponse", async (req, reply) => {
    // Only intercept admin mutation routes
    const pathname =
      req.url.indexOf("?") === -1 ? req.url : req.url.slice(0, req.url.indexOf("?"));
    if (!pathname.startsWith("/admin")) return;
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
    if (SKIP_PATHS.has(pathname)) return;
    if (isAlreadyLogged(req)) return;

    const actor = req.adminAuth?.user;
    if (!actor) return;

    recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name ?? null,
      action: `${req.method} ${pathname}`,
      category: inferCategory(pathname),
      description: `Auto-captured: ${req.method} ${pathname}`,
      method: req.method,
      path: pathname,
      statusCode: reply.statusCode,
      ipAddress: req.ip ?? null,
      autoCapture: true,
    });
  });
});
