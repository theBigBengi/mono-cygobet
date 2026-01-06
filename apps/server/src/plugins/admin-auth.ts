// src/plugins/admin-auth.ts
import fp from "fastify-plugin";
import type { preHandlerHookHandler, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { ADMIN_SESSION_COOKIE_NAME } from "../constants/admin-auth.constants";
import { ADMIN_ROLE } from "../constants/roles.constants";
import type { AdminAuthContext } from "../auth/admin-auth.types";
import { adminSessionDb } from "../auth/admin-session";

const PUBLIC_ADMIN_PATHS = new Set<string>([
  "/admin/auth/login",
  "/admin/auth/logout",
]);

function getPathname(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

export default fp(async function adminAuthPlugin(fastify) {
  // Typed request context for resolved admin auth (memoized per-request)
  fastify.decorateRequest("adminAuth", null);
  fastify.decorateRequest("adminAuthResolved", false);

  async function resolve(
    req: FastifyRequest
  ): Promise<AdminAuthContext | null> {
    if (req.adminAuthResolved) return req.adminAuth;

    const rawToken = req.cookies?.[ADMIN_SESSION_COOKIE_NAME];
    const resolved = await adminSessionDb.resolve(rawToken);

    req.adminAuthResolved = true;
    req.adminAuth = resolved
      ? { user: resolved.user, session: resolved.session }
      : null;
    return req.adminAuth;
  }

  async function assertAuth(req: FastifyRequest): Promise<AdminAuthContext> {
    const ctx = await resolve(req);
    if (!ctx) throw new UnauthorizedError("Unauthorized");
    return ctx;
  }

  async function assertAdmin(req: FastifyRequest): Promise<AdminAuthContext> {
    const ctx = await assertAuth(req);
    if (ctx.user.role !== ADMIN_ROLE) {
      throw new ForbiddenError("Admin access required");
    }
    return ctx;
  }

  const requireAuth: preHandlerHookHandler = async (req) => {
    await assertAuth(req);
  };

  const requireAdmin: preHandlerHookHandler = async (req) => {
    await assertAdmin(req);
  };

  fastify.decorate("adminAuth", {
    resolve,
    assertAuth,
    assertAdmin,
    requireAuth,
    requireAdmin,
  });

  /**
   * Admin-only route protection:
   * - Anything under `/admin/*` requires an ADMIN session, except the auth endpoints themselves.
   * - This is backend-first and ensures new admin routes are protected by default.
   */
  fastify.addHook("onRequest", async (req) => {
    const pathname = getPathname(req.url);
    if (!pathname.startsWith("/admin")) return;
    if (PUBLIC_ADMIN_PATHS.has(pathname)) return;
    await assertAdmin(req);
  });
});
