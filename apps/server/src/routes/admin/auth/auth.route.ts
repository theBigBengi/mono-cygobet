// src/routes/admin/auth/auth.route.ts
import { FastifyPluginAsync } from "fastify";
import { AdminAuthService } from "../../../services/admin/admin-auth.service";
import {
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "../../../auth/admin-cookies";
import { ADMIN_SESSION_COOKIE_NAME } from "../../../constants/admin-auth.constants";
import {
  adminLoginBodySchema,
  adminAuthOkResponseSchema,
  adminMeResponseSchema,
} from "../../../schemas/admin/auth.schemas";

type AdminAuthOkResponse = { status: "success"; message: string };
type AdminMeResponse = {
  status: "success";
  data: { id: number; email: string; role: string; name: string | null };
};

type AdminLoginBody = {
  email: string;
  password: string;
};

/**
 * Admin Auth Routes
 * ----------------
 * Mounted under `/admin/auth` by Fastify autoload folder prefix.
 *
 * - POST /admin/auth/login
 * - POST /admin/auth/logout
 */
const adminAuthRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AdminAuthService(fastify);

  fastify.post<{ Body: AdminLoginBody; Reply: AdminAuthOkResponse }>(
    "/login",
    {
      schema: {
        body: adminLoginBodySchema,
        response: { 200: adminAuthOkResponseSchema },
      },
    },
    async (req, reply): Promise<AdminAuthOkResponse> => {
      const { rawSessionToken, expires } = await service.login(req.body);

      setAdminSessionCookie(reply, rawSessionToken, expires);

      return reply.send({ status: "success", message: "Logged in" });
    }
  );

  fastify.post<{ Reply: AdminAuthOkResponse }>(
    "/logout",
    {
      schema: {
        response: { 200: adminAuthOkResponseSchema },
      },
    },
    async (req, reply): Promise<AdminAuthOkResponse> => {
      const rawToken = req.cookies?.[ADMIN_SESSION_COOKIE_NAME];

      // Idempotent: safe even if cookie/session is missing.
      await service.logout(rawToken);

      clearAdminSessionCookie(reply);

      // Also clear memoized auth context for this request (if any downstream hooks run).
      req.adminAuthResolved = true;
      req.adminAuth = null;

      return reply.send({ status: "success", message: "Logged out" });
    }
  );

  fastify.get<{ Reply: AdminMeResponse }>(
    "/me",
    {
      schema: {
        response: { 200: adminMeResponseSchema },
      },
    },
    async (req, reply): Promise<AdminMeResponse> => {
      // NOTE: `/admin/*` is protected by the global admin-auth plugin hook.
      // Avoid double DB lookups; use the memoized request context.
      const ctx = req.adminAuth;
      if (!ctx) throw new Error("Admin auth context missing");
      return reply.send({
        status: "success",
        data: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: ctx.user.role,
          name: ctx.user.name ?? null,
        },
      });
    }
  );
};

export default adminAuthRoutes;
