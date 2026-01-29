// src/routes/admin/auth/auth.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { AdminAuthService } from "../../../services/admin/admin-auth.service";
import {
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "../../../auth/admin-cookies";
import { adminSessionDb, createAdminSession } from "../../../auth/admin-session";
import { ADMIN_SESSION_COOKIE_NAME } from "../../../constants/admin-auth.constants";
import {
  adminLoginBodySchema,
  adminAuthOkResponseSchema,
  adminMeResponseSchema,
  adminUpdateProfileBodySchema,
  adminChangePasswordBodySchema,
  adminUpdateProfileResponseSchema,
} from "../../../schemas/admin/auth.schemas";

type AdminAuthOkResponse = { status: "success"; message: string };
type AdminMeResponse = {
  status: "success";
  data: {
    id: number;
    email: string;
    role: string;
    name: string | null;
    lastLoginAt: string | null;
  };
};

type AdminUpdateProfileResponse = {
  status: "success";
  data: { id: number; email: string; role: string; name: string | null };
  message: string;
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
 * - POST   /admin/auth/login
 * - POST   /admin/auth/logout
 * - GET    /admin/auth/me
 * - POST   /admin/auth/profile
 * - POST   /admin/auth/change-password
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

      // Fetch user with lastLoginAt from database
      const user = await prisma.users.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          lastLoginAt: true,
        },
      });

      if (!user) throw new Error("User not found");

      return reply.send({
        status: "success",
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name ?? null,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        },
      });
    }
  );

  fastify.post<{
    Body: { name?: string | null };
    Reply: AdminUpdateProfileResponse;
  }>(
    "/profile",
    {
      schema: {
        body: adminUpdateProfileBodySchema,
        response: { 200: adminUpdateProfileResponseSchema },
      },
    },
    async (req, reply): Promise<AdminUpdateProfileResponse> => {
      const ctx = req.adminAuth;
      if (!ctx) throw new Error("Admin auth context missing");

      const updated = await service.updateProfile(ctx.user.id, req.body);

      return reply.send({
        status: "success",
        data: updated,
        message: "Profile updated successfully",
      });
    }
  );

  fastify.post<{
    Body: { currentPassword: string; newPassword: string };
    Reply: AdminAuthOkResponse;
  }>(
    "/change-password",
    {
      schema: {
        body: adminChangePasswordBodySchema,
        response: { 200: adminAuthOkResponseSchema },
      },
    },
    async (req, reply): Promise<AdminAuthOkResponse> => {
      const ctx = req.adminAuth;
      if (!ctx) throw new Error("Admin auth context missing");

      // Perform password update, session invalidation and new session creation
      // atomically in a single DB transaction. Any failure will rollback and
      // propagate the error to the requester.
      await prisma.$transaction(async (tx) => {
        // Update password using the transactional client (keeps same validation
        // and hashing behavior as the service).
        await service.changePassword(ctx.user.id, req.body, tx);

        // Delete all existing sessions for the user.
        await tx.sessions.deleteMany({ where: { userId: ctx.user.id } });

        // Create a fresh session within the same transaction.
        const { rawToken, expires, sessionId } = await createAdminSession(
          tx,
          ctx.user.id
        );

        // Set cookie and update memoized request auth context for the new session.
        setAdminSessionCookie(reply, rawToken, expires);
        req.adminAuthResolved = true;
        req.adminAuth = {
          user: ctx.user,
          session: { id: sessionId, userId: ctx.user.id, expires },
        };
      });

      return reply.send({
        status: "success",
        message: "Password changed successfully",
      });
    }
  );
};

console.log("REGISTERING adminAuthRoutes");
export default adminAuthRoutes;
