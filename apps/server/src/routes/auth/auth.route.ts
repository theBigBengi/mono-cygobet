// src/routes/auth/auth.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { BadRequestError, UnauthorizedError } from "../../utils/errors/app-error";
import {
  UserAuthService,
  isAllowedRedirectUri,
  buildGoogleAuthUrl,
  sha256Base64Url,
  exchangeGoogleCode,
  generateRandomToken,
} from "../../services/auth/user-auth.service";
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
import { userRefreshSessionDb, createUserRefreshSession } from "../../auth/user-refresh-session";
import { generateAccessToken } from "../../auth/user-tokens";
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
  changePasswordBodySchema,
  changePasswordResponseSchema,
  googleStartQuerySchema,
  googleCallbackQuerySchema,
  googleExchangeBodySchema,
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
  hasPassword: boolean;
};

type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

type ChangePasswordResponse = { success: true; message: string };

/** True when client is Expo Web (sends X-Client: web). Native does not send this. */
function isWebClient(req: {
  headers: { [key: string]: string | string[] | undefined };
}): boolean {
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

      // Fetch user from database to get latest data (password only for hasPassword flag)
      const user = await prisma.users.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          role: true,
          password: true,
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
        hasPassword: !!user.password,
      });
    }
  );

  fastify.post<{
    Body: ChangePasswordBody;
    Reply: ChangePasswordResponse;
  }>(
    "/change-password",
    {
      schema: {
        body: changePasswordBodySchema,
        response: { 200: changePasswordResponseSchema },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply): Promise<ChangePasswordResponse> => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");
      await service.changePassword(
        ctx.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );
      return reply.send({
        success: true,
        message: "Password changed successfully",
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

  fastify.get<{
    Querystring: { username: string };
    Reply: { available: boolean };
  }>(
    "/username/check",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string", minLength: 3, maxLength: 50 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { available: { type: "boolean" } },
          },
        },
      },
      preHandler: [fastify.userAuth.requireAuth],
    },
    async (req, reply) => {
      const username = req.query.username.trim();
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      // Check if username exists (excluding current user)
      const existing = await prisma.users.findUnique({
        where: { username },
        select: { id: true },
      });

      const available = !existing || existing.id === ctx.user.id;
      return reply.send({ available });
    }
  );

  // ============================================================
  // Server-Side OAuth Flow (for Expo Go / Web / Fallback)
  // ============================================================

  /**
   * GET /auth/google/start
   * Initiates server-side OAuth flow.
   * Query: redirect_uri (required) - where to redirect after auth
   * Returns: Redirect to Google OAuth
   */
  fastify.get<{
    Querystring: { redirect_uri: string };
  }>(
    "/google/start",
    {
      schema: {
        querystring: googleStartQuerySchema,
      },
    },
    async (req, reply) => {
      const { redirect_uri } = req.query;

      // Validate redirect_uri (must be allowed scheme)
      if (!isAllowedRedirectUri(redirect_uri)) {
        throw new BadRequestError("Invalid redirect_uri");
      }

      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new BadRequestError("Google OAuth is not configured");
      }

      // Generate state + PKCE code_verifier
      const state = generateRandomToken(32);
      const codeVerifier = generateRandomToken(64);
      const codeChallenge = sha256Base64Url(codeVerifier);

      // Determine callback URL based on environment
      const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;
      const callbackUri = `${serverUrl}/auth/google/callback`;

      // Store in DB (expires in 10 minutes)
      await prisma.oauthStates.create({
        data: {
          state,
          codeVerifier,
          redirectUri: redirect_uri,
          provider: "google",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Build Google OAuth URL
      const googleAuthUrl = buildGoogleAuthUrl({
        clientId: googleClientId,
        redirectUri: callbackUri,
        state,
        codeChallenge,
        scope: "openid email profile",
      });

      return reply.redirect(googleAuthUrl);
    }
  );

  /**
   * GET /auth/google/callback
   * Google redirects here after user consents.
   * Query: code, state, error
   * Returns: Redirect to app with OTC
   */
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string };
  }>(
    "/google/callback",
    {
      schema: {
        querystring: googleCallbackQuerySchema,
      },
    },
    async (req, reply) => {
      const { code, state, error } = req.query;

      // Lookup state first to get redirect URI for error handling
      const oauthState = state
        ? await prisma.oauthStates.findUnique({ where: { state } })
        : null;

      const redirectUri = oauthState?.redirectUri || "mobile://oauth";

      if (error) {
        // Redirect to app with error
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", error);
        return reply.redirect(errorUrl.toString());
      }

      if (!code || !state) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", "missing_params");
        return reply.redirect(errorUrl.toString());
      }

      if (!oauthState || oauthState.expiresAt < new Date() || oauthState.usedAt) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", "invalid_state");
        return reply.redirect(errorUrl.toString());
      }

      try {
        // Determine callback URL for token exchange
        const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`;
        const callbackUri = `${serverUrl}/auth/google/callback`;

        // Exchange code for tokens (server-side, with client_secret)
        const googleTokens = await exchangeGoogleCode({
          code,
          codeVerifier: oauthState.codeVerifier,
          redirectUri: callbackUri,
        });

        // Validate idToken and get/create user (reuse existing logic)
        const result = await service.loginWithGoogle({ idToken: googleTokens.id_token });

        // Generate OTC
        const otc = generateRandomToken(32);

        // Update state with OTC
        await prisma.oauthStates.update({
          where: { id: oauthState.id },
          data: {
            usedAt: new Date(),
            otc,
            otcExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            userId: result.user.id,
          },
        });

        // Redirect to app with OTC
        const successUrl = new URL(oauthState.redirectUri);
        successUrl.searchParams.set("otc", otc);

        return reply.redirect(successUrl.toString());
      } catch (err) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", "auth_failed");
        return reply.redirect(errorUrl.toString());
      }
    }
  );

  /**
   * POST /auth/google/exchange
   * App exchanges OTC for tokens.
   * Body: { otc: string }
   * Returns: { user, accessToken, refreshToken }
   */
  fastify.post<{
    Body: { otc: string };
    Reply: UserAuthResponse;
  }>(
    "/google/exchange",
    {
      schema: {
        body: googleExchangeBodySchema,
        response: { 200: userAuthResponseSchema },
      },
    },
    async (req, reply): Promise<UserAuthResponse> => {
      const { otc } = req.body;

      // Lookup OTC
      const oauthState = await prisma.oauthStates.findUnique({
        where: { otc },
      });

      if (!oauthState || !oauthState.otcExpiresAt || oauthState.otcExpiresAt < new Date()) {
        throw new UnauthorizedError("Invalid or expired code");
      }

      if (!oauthState.userId) {
        throw new UnauthorizedError("Invalid OAuth state");
      }

      // Get user
      const user = await prisma.users.findUnique({
        where: { id: oauthState.userId },
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
        throw new UnauthorizedError("User not found");
      }

      const now = new Date();

      // Create refresh session and delete used state in transaction
      const result = await prisma.$transaction(async (tx) => {
        const { rawToken: refreshToken } = await createUserRefreshSession(
          tx,
          user.id,
          now
        );

        const accessToken = generateAccessToken(fastify, user.id, user.role);

        // Delete used state
        await tx.oauthStates.delete({ where: { id: oauthState.id } });

        return { refreshToken, accessToken };
      });

      if (isWebClient(req)) {
        const expires = new Date(Date.now() + USER_REFRESH_TOKEN_TTL_MS);
        setUserRefreshCookie(reply, result.refreshToken, expires);
      }

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          image: user.image,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
  );
};

export default userAuthRoutes;
