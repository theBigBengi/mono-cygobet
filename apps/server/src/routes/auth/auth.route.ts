// src/routes/auth/auth.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { UserAuthService } from "../../services/auth/user-auth.service";
import { UserOnboardingService } from "../../services/auth/user-onboarding.service";
import { isOnboardingRequired } from "../../auth/user-onboarding";
import {
  userRegisterBodySchema,
  userLoginBodySchema,
  userGoogleBodySchema,
  userRefreshBodySchema,
  userLogoutBodySchema,
  userAuthResponseSchema,
  userRefreshResponseSchema,
  userLogoutResponseSchema,
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

/**
 * User Auth Routes
 * ----------------
 * Mounted under `/auth` by Fastify autoload folder prefix.
 *
 * - POST   /auth/register
 * - POST   /auth/login
 * - POST   /auth/google
 * - POST   /auth/refresh
 * - POST   /auth/logout
 * - GET    /auth/me
 */
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
      const result = await service.refresh(req.body);
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
      await service.logout(req.body);
      return reply.send({ status: "success" });
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
