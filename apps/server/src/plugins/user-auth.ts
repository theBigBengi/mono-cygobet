// src/plugins/user-auth.ts
import fp from "fastify-plugin";
import type { preHandlerHookHandler, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../utils/errors";
import type { UserAuthContext } from "../auth/user-auth.types";
import { verifyAccessToken } from "../auth/user-tokens";
import { prisma } from "@repo/db";

export default fp(async function userAuthPlugin(fastify) {
  // Typed request context for resolved user auth (memoized per-request)
  fastify.decorateRequest("userAuth", null);
  fastify.decorateRequest("userAuthResolved", false);

  async function resolve(req: FastifyRequest): Promise<UserAuthContext | null> {
    if (req.userAuthResolved) return req.userAuth;

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.userAuthResolved = true;
      req.userAuth = null;
      return null;
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix

    try {
      const payload = verifyAccessToken(fastify, accessToken);

      // Fetch user from DB to ensure it still exists and get latest data
      const user = await prisma.users.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          role: true,
        },
      });

      if (!user) {
        req.userAuthResolved = true;
        req.userAuth = null;
        return null;
      }

      const ctx: UserAuthContext = {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          image: user.image,
          role: user.role,
        },
      };

      req.userAuthResolved = true;
      req.userAuth = ctx;
      return ctx;
    } catch (err) {
      req.userAuthResolved = true;
      req.userAuth = null;
      return null;
    }
  }

  async function assertAuth(req: FastifyRequest): Promise<UserAuthContext> {
    const ctx = await resolve(req);
    if (!ctx) throw new UnauthorizedError("Unauthorized");
    return ctx;
  }

  const requireAuth: preHandlerHookHandler = async (req) => {
    await assertAuth(req);
  };

  fastify.decorate("userAuth", {
    resolve,
    assertAuth,
    requireAuth,
  });
});
