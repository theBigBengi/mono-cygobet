// src/routes/auth/auth.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { BadRequestError } from "../../utils/errors/app-error";
import { UserAuthService } from "../../services/auth/user-auth.service";
import { UserOnboardingService } from "../../services/auth/user-onboarding.service";
import { isOnboardingRequired } from "../../auth/user-onboarding";
import {
  setUserRefreshCookie,
  clearUserRefreshCookie,
} from "../../auth/user-refresh-cookies";
import {
  USER_REFRESH_COOKIE_NAME,
  USER_REFRESH_TOKEN_TTL_MS,
} from "../../constants/user-auth.constants";
import { userRefreshSessionDb } from "../../auth/user-refresh-session";
import {
  userRegisterBodySchema,
  userLoginBodySchema,
  userGoogleBodySchema,
  userRefreshBodySchema,
  userLogoutBodySchema,
  userAuthResponseSchema,
  userRefreshResponseSchema,
  userLogoutResponseSchema,
  userRevokeAllResponseSchema,
  userMeResponseSchema,
  userOnboardingCompleteBodySchema,
  userOnboardingCompleteResponseSchema,
} from "../../schemas/auth/user-auth.schemas";

type UserRegisterBody = {
  email: string;
  username?: string | null;
  password: string;
  name?: string | null;
};

type UserLoginBody = {
  emailOrUsername: string;
  password: string;
};

type UserGoogleBody = {
  idToken: string;
};

type UserRefreshBody = {
  refreshToken: string;
};

type UserLogoutBody = {
  refreshToken?: string;
};

type UserAuthResponse = {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image?: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

type UserRefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type UserLogoutResponse = {
  status: "success";
};

type UserMeResponse = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  image: string | null;
  role: string;
  onboardingRequired: boolean;
};

/** True when client is Expo Web (sends X-Client: web). Native does not send this. */
function isWebClient(req: { headers: { [key: string]: string | string[] | undefined } }): boolean {
  const v = req.headers["x-client"];
  return v === "web" || (Array.isArray(v) && v.includes("web"));
}

const userAuthRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new UserAuthService(fastify);
  const onboardingService = new UserOnboardingService(fastify);

  fastify.post<{ Body: UserRegisterBody; Reply: UserAuthResponse }>(
    "/register",
    {
      schema: {
        body: userRegisterBodySchema,
        response: { 200: userAuthResponseSchema },
      },
    },
    async (req, reply): Promise<UserAuthResponse> => {
      const result = await service.register(req.body);
      if (isWebClient(req)) {
        const expires = new Date(Date.now() + USER_REFRESH_TOKEN_TTL_MS);
        setUserRefreshCookie(reply, result.refreshToken, expires);
      }
      return reply.send(result);
    }
  );

  fastify.post<{ Body: UserLoginBody; Reply: UserAuthResponse }>(
    "/login",
    {
      schema: {
        body: userLoginBodySchema,
        response: { 200: userAuthResponseSchema },
      },
    },
    async (req, reply): Promise<UserAuthResponse> => {
      const result = await service.login(req.body);
      if (isWebClient(req)) {
        const expires = new Date(Date.now() + USER_REFRESH_TOKEN_TTL_MS);
        setUserRefreshCookie(reply, result.refreshToken, expires);
      }
      return reply.send(result);
    }
  );

  fastify.post<{ Body: UserGoogleBody; Reply: UserAuthResponse }>(
    "/google",
    {
      schema: {
        body: userGoogleBodySchema,
        response: { 200: userAuthResponseSchema },
      },
    },
    async (req, reply): Promise<UserAuthResponse> => {
      const result = await service.loginWithGoogle(req.body);
      if (isWebClient(req)) {
        const expires = new Date(Date.now() + USER_REFRESH_TOKEN_TTL_MS);
        setUserRefreshCookie(reply, result.refreshToken, expires);
      }
      return reply.send(result);
    }
  );

  fastify.post<{ Body: UserRefreshBody; Reply: UserRefreshResponse }>(
    "/refresh",
    {
      schema: {
        body: userRefreshBodySchema,
        response: { 200: userRefreshResponseSchema },
      },
    },
    async (req, reply): Promise<UserRefreshResponse> => {
      const tokenFromCookie = req.cookies?.[USER_REFRESH_COOKIE_NAME];
      const tokenFromBody = req.body?.refreshToken;
      const refreshToken = tokenFromCookie ?? tokenFromBody;
      if (!refreshToken) {
        throw new BadRequestError("Refresh token is required");
      }
      const result = await service.refresh({ refreshToken });
      if (isWebClient(req)) {
        const expires = new Date(Date.now() + USER_REFRESH_TOKEN_TTL_MS);
        setUserRefreshCookie(reply, result.refreshToken, expires);
      }
      return reply.send(result);
    }
  );

  fastify.post<{ Body: UserLogoutBody; Reply: UserLogoutResponse }>(
    "/logout",
    {
      schema: {
        body: userLogoutBodySchema,
        response: { 200: userLogoutResponseSchema },
      },
    },
    async (req, reply): Promise<UserLogoutResponse> => {
      const tokenFromBody = req.body?.refreshToken;
      const tokenFromCookie = req.cookies?.[USER_REFRESH_COOKIE_NAME];
      const refreshToken = tokenFromBody ?? tokenFromCookie;
      await service.logout({ refreshToken });
      clearUserRefreshCookie(reply);
      return reply.send({ status: "success" });
    }
  );

  fastify.post<{ Reply: { revoked: boolean } }>(
    "/sessions/revoke-all",
    {
      schema: {
        response: { 200: userRevokeAllResponseSchema },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");
      await userRefreshSessionDb.revokeAllByUserId(ctx.user.id);
      return reply.send({ revoked: true });
    }
  );

  fastify.get<{ Reply: UserMeResponse }>(
    "/me",
    {
      schema: {
        response: { 200: userMeResponseSchema },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply): Promise<UserMeResponse> => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      // Fetch user from database to get latest data
      const user = await prisma.users.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          role: true,
        },
      });

      if (!user) throw new Error("User not found");

      // Compute onboarding status (authoritative server-side check)
      const onboardingRequired = await isOnboardingRequired(prisma, user.id);

      return reply.send({
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        image: user.image,
        role: user.role,
        onboardingRequired,
      });
    }
  );

  fastify.post<{
    Body: { username: string };
    Reply: { success: boolean };
  }>(
    "/onboarding/complete",
    {
      schema: {
        body: userOnboardingCompleteBodySchema,
        response: { 200: userOnboardingCompleteResponseSchema },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      // Use authenticated user ID from token, not client-provided
      const result = await onboardingService.completeOnboarding(
        ctx.user.id,
        req.body.username
      );
      return reply.send(result);
    }
  );
};

export default userAuthRoutes;
