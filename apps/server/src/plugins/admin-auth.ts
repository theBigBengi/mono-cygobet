// src/plugins/admin-auth.ts
import fp from "fastify-plugin";
import type { preHandlerHookHandler, FastifyRequest, FastifyReply } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { ADMIN_SESSION_COOKIE_NAME } from "../constants/admin-auth.constants";
import { ADMIN_ROLE } from "../constants/roles.constants";
import type { AdminAuthContext } from "../types/auth";
import { adminSessionDb, shouldRenewSession } from "../auth/admin-session";
import { setAdminSessionCookie } from "../auth/admin-cookies";
import { ADMIN_SESSION_RENEWAL_THRESHOLD_PCT } from "../constants/admin-auth.constants";

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
    req: FastifyRequest,
    reply?: FastifyReply
  ): Promise<AdminAuthContext | null> {
    if (req.adminAuthResolved) return req.adminAuth;

    const rawToken = req.cookies?.[ADMIN_SESSION_COOKIE_NAME];
    const resolved = await adminSessionDb.resolve(rawToken);

    req.adminAuthResolved = true;
    req.adminAuth = resolved
      ? { user: resolved.user, session: resolved.session }
      : null;

    // Sliding renewal: if session is close to expiry, renew and set cookie.
    if (req.adminAuth && reply) {
      try {
        const { session } = req.adminAuth;
        if (
          shouldRenewSession(session.expires, new Date(), ADMIN_SESSION_RENEWAL_THRESHOLD_PCT)
        ) {
          const newExpires = await adminSessionDb.renewByRawToken(rawToken);
          if (newExpires && rawToken) {
            setAdminSessionCookie(reply, rawToken, newExpires);
            // reflect updated expiry in request context
            req.adminAuth = { user: req.adminAuth.user, session: { ...session, expires: newExpires } };
          }
        }
      } catch {
        // best-effort: do not fail the request if renewal fails
      }
    }

    return req.adminAuth;
  }

  async function assertAuth(req: FastifyRequest, reply?: FastifyReply): Promise<AdminAuthContext> {
    const ctx = await resolve(req, reply);
    if (!ctx) throw new UnauthorizedError("Unauthorized");
    return ctx;
  }

  async function assertAdmin(req: FastifyRequest, reply?: FastifyReply): Promise<AdminAuthContext> {
    const ctx = await assertAuth(req, reply);
    if (ctx.user.role !== ADMIN_ROLE) {
      throw new ForbiddenError("Admin access required");
    }
    return ctx;
  }

  const requireAuth: preHandlerHookHandler = async (req, reply) => {
    await assertAuth(req, reply);
  };

  const requireAdmin: preHandlerHookHandler = async (req, reply) => {
    await assertAdmin(req, reply);
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
  fastify.addHook("onRequest", async (req, reply) => {
    const pathname = getPathname(req.url);
    if (!pathname.startsWith("/admin")) return;
    if (PUBLIC_ADMIN_PATHS.has(pathname)) return;
    // Pass reply so renewal can set cookie when appropriate.
    await assertAdmin(req, reply);
  });
});
