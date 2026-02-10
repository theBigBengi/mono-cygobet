// src/services/auth/user-auth.service.ts
import type { FastifyInstance } from "fastify";
import * as bcrypt from "bcrypt";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("UserAuth");
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from "../../utils/errors/app-error";
import { USER_ROLE } from "../../constants/roles.constants";
import { generateAccessToken } from "../../auth/user-tokens";
import {
  createUserRefreshSession,
  resolveUserRefreshSessionByRawToken,
  rotateUserRefreshSessionTx,
  revokeUserRefreshSessionByRawToken,
  revokeAllUserRefreshSessionsByUserId,
} from "../../auth/user-refresh-session";
import {
  ensureUserProfile,
  isOnboardingRequired,
} from "../../auth/user-onboarding";
import { generateRandomToken } from "../../utils/crypto";

/**
 * Compute SHA-256 and return as Base64URL (for PKCE code_challenge).
 */
export function sha256Base64Url(input: string): string {
  return crypto
    .createHash("sha256")
    .update(input, "utf8")
    .digest("base64url");
}

/**
 * Allowed redirect URI prefixes for OAuth flow.
 * Only exact scheme + host prefixes are allowed to prevent open redirect attacks.
 * Add additional allowed origins via OAUTH_ALLOWED_REDIRECT_URIS env var (comma-separated).
 */
const DEFAULT_ALLOWED_REDIRECT_PREFIXES = [
  "mobile://",
  "exp://",
  "http://localhost",
  "http://127.0.0.1",
  "http://10.0.2.2", // Android emulator
];

export function isAllowedRedirectUri(uri: string): boolean {
  const extraUris = process.env.OAUTH_ALLOWED_REDIRECT_URIS;
  const allowed = extraUris
    ? [...DEFAULT_ALLOWED_REDIRECT_PREFIXES, ...extraUris.split(",").map((s) => s.trim())]
    : DEFAULT_ALLOWED_REDIRECT_PREFIXES;

  return allowed.some((prefix) => uri.startsWith(prefix));
}

/**
 * Build Google OAuth authorization URL with PKCE.
 */
export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/**
 * Exchange Google authorization code for tokens (server-side).
 */
export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ id_token: string; access_token: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new BadRequestError("Google OAuth is not configured");
  }

  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    code: params.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error({ error: errorText }, "Google token exchange failed");
    throw new UnauthorizedError("Failed to exchange Google authorization code");
  }

  const tokens = (await response.json()) as {
    id_token: string;
    access_token: string;
  };

  return tokens;
}

/**
 * Delete expired OAuth states (opportunistic cleanup).
 * Call this before creating new states to keep the table clean.
 */
export async function cleanupExpiredOAuthStates(): Promise<number> {
  const result = await prisma.oauthStates.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

export { generateRandomToken };

export class UserAuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(private fastify: FastifyInstance) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

  /**
   * Verify Google idToken and find-or-create the user WITHOUT creating sessions.
   * Used by the server-side OAuth callback to get the userId for OTC,
   * avoiding orphaned refresh sessions.
   */
  async findOrCreateUserByGoogle(input: { idToken: string }): Promise<{
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image: string | null;
    role: string;
  }> {
    if (!this.googleClient) {
      throw new BadRequestError("Google OAuth is not configured");
    }

    let googlePayload: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    try {
      const validAudiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
      ].filter(Boolean) as string[];

      const ticket = await this.googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: validAudiences,
      });
      googlePayload = ticket.getPayload() as typeof googlePayload;
    } catch (err) {
      throw new UnauthorizedError("Invalid Google ID token");
    }

    if (!googlePayload || !googlePayload.email) {
      throw new UnauthorizedError("Invalid Google ID token payload");
    }

    const providerAccountId = googlePayload.sub;
    const email = googlePayload.email.toLowerCase().trim();
    const name = googlePayload.name?.trim() || null;
    const picture = googlePayload.picture || null;

    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      // Check if account exists (by provider + providerAccountId)
      const account = await tx.accounts.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId,
          },
        },
        include: { user: true },
      });

      if (account) {
        return account.user;
      }

      // Check if user exists by email
      const existingUser = await tx.users.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          role: true,
          emailVerifiedAt: true,
        },
      });

      if (existingUser) {
        if (!existingUser.emailVerifiedAt && googlePayload.email_verified === true) {
          await tx.users.update({
            where: { id: existingUser.id },
            data: { emailVerifiedAt: now },
            select: { id: true },
          });
        }

        await tx.accounts.create({
          data: {
            userId: existingUser.id,
            type: "oauth",
            provider: "google",
            providerAccountId,
          },
        });

        await ensureUserProfile(tx, existingUser.id);
        return existingUser;
      }

      // Create new user
      const emailVerifiedAt = googlePayload.email_verified === true ? now : null;

      const newUser = await tx.users.create({
        data: {
          email,
          username: null,
          password: null,
          name,
          image: picture,
          role: USER_ROLE,
          emailVerifiedAt,
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          role: true,
        },
      });

      await tx.accounts.create({
        data: {
          userId: newUser.id,
          type: "oauth",
          provider: "google",
          providerAccountId,
        },
      });

      await ensureUserProfile(tx, newUser.id);
      return newUser;
    });

    // Update lastLoginAt
    await prisma.users.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
      select: { id: true },
    });

    log.info({ userId: user.id }, "user google find-or-create success");

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      image: user.image,
      role: user.role,
    };
  }

  /**
   * Hash password using bcrypt (12 rounds)
   */
  async hashPassword(plain: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plain, saltRounds);
  }

  /**
   * Register a new user with email/password (username optional)
   */
  async register(input: {
    email: string;
    username?: string | null;
    password: string;
    name?: string | null;
  }): Promise<{
    user: {
      id: number;
      email: string;
      username: string | null;
      name: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim() || null;
    const password = input.password;
    const name = input.name?.trim() || null;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    // Validate email format (basic check, schema will do more)
    if (!email.includes("@")) {
      throw new BadRequestError("Invalid email format");
    }

    // Check if email already exists
    const existingEmail = await prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictError("Email already registered");
    }

    // Check if username already exists (only if provided)
    if (username) {
      const existingUsername = await prisma.users.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existingUsername) {
        throw new ConflictError("Username already taken");
      }
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    const now = new Date();

    // Create user, profile, and refresh session in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          email,
          username,
          password: passwordHash,
          name,
          role: USER_ROLE,
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
        },
      });

      // Ensure profile exists (onboarding_done defaults to false)
      await ensureUserProfile(tx, user.id);

      const { rawToken: refreshToken } = await createUserRefreshSession(
        tx,
        user.id,
        now
      );

      const accessToken = generateAccessToken(this.fastify, user.id, user.role);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    });

    log.info({ userId: result.user.id }, "user registered");

    return result;
  }

  /**
   * Login with email/username and password
   */
  async login(input: { emailOrUsername: string; password: string }): Promise<{
    user: {
      id: number;
      email: string;
      username: string | null;
      name: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    const emailOrUsername = input.emailOrUsername?.trim();
    const password = input.password;

    if (!emailOrUsername || !password) {
      throw new BadRequestError("Email/username and password are required");
    }

    // Try to find user by email (normalized) or username
    const normalizedEmail = emailOrUsername.toLowerCase();
    const user = await prisma.users.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: emailOrUsername }],
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        password: true,
      },
    });

    // Avoid user enumeration: keep errors consistent
    const invalid = () => new UnauthorizedError("Invalid credentials");

    if (!user) throw invalid();
    if (!user.password) throw invalid();

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw invalid();

    const now = new Date();

    // Create refresh session, ensure profile, and update lastLoginAt in transaction
    const result = await prisma.$transaction(async (tx) => {
      const { rawToken: refreshToken } = await createUserRefreshSession(
        tx,
        user.id,
        now
      );

      // Ensure profile exists for any user logging in (idempotent)
      await ensureUserProfile(tx, user.id);

      await tx.users.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
        select: { id: true },
      });

      const accessToken = generateAccessToken(this.fastify, user.id, user.role);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    });

    log.info({ userId: user.id }, "user login success");

    return result;
  }

  /**
   * Login/register with Google OAuth (idToken)
   */
  async loginWithGoogle(input: { idToken: string }): Promise<{
    user: {
      id: number;
      email: string;
      username: string | null;
      name: string | null;
      image: string | null;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    if (!this.googleClient) {
      throw new BadRequestError("Google OAuth is not configured");
    }

    let googlePayload: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    try {
      // Accept tokens from Web, iOS, and Android client IDs
      const validAudiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
      ].filter(Boolean) as string[];

      const ticket = await this.googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: validAudiences,
      });
      googlePayload = ticket.getPayload() as typeof googlePayload;
    } catch (err) {
      throw new UnauthorizedError("Invalid Google ID token");
    }

    if (!googlePayload || !googlePayload.email) {
      throw new UnauthorizedError("Invalid Google ID token payload");
    }

    const providerAccountId = googlePayload.sub;
    const email = googlePayload.email.toLowerCase().trim();
    const name = googlePayload.name?.trim() || null;
    const picture = googlePayload.picture || null;

    const now = new Date();

    // Upsert user and account
    const result = await prisma.$transaction(async (tx) => {
      // Check if account exists (by provider + providerAccountId)
      let account = await tx.accounts.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId,
          },
        },
        include: { user: true },
      });

      let user;

      if (account) {
        // Account exists, use its user
        user = account.user;
      } else {
        // Check if user exists by email
        const existingUser = await tx.users.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            image: true,
            role: true,
            emailVerifiedAt: true,
          },
        });

        if (existingUser) {
          // Link account to existing user
          user = existingUser;

          // Update emailVerifiedAt if it's null and Google says verified
          const shouldUpdateEmailVerified =
            !user.emailVerifiedAt && googlePayload.email_verified === true;

          if (shouldUpdateEmailVerified) {
            await tx.users.update({
              where: { id: user.id },
              data: { emailVerifiedAt: now },
              select: { id: true },
            });
          }

          await tx.accounts.create({
            data: {
              userId: user.id,
              type: "oauth",
              provider: "google",
              providerAccountId,
            },
          });

          // Ensure profile exists for existing user (idempotent)
          await ensureUserProfile(tx, user.id);
        } else {
          // Create new user
          // Only set emailVerifiedAt if Google says the email is verified
          const emailVerifiedAt =
            googlePayload.email_verified === true ? now : null;

          user = await tx.users.create({
            data: {
              email,
              username: null, // Google users don't get username by default
              password: null,
              name,
              image: picture,
              role: USER_ROLE,
              emailVerifiedAt,
            },
            select: {
              id: true,
              email: true,
              username: true,
              name: true,
              image: true,
              role: true,
            },
          });

          await tx.accounts.create({
            data: {
              userId: user.id,
              type: "oauth",
              provider: "google",
              providerAccountId,
            },
          });

          // Ensure profile exists for new user (onboarding_done defaults to false)
          await ensureUserProfile(tx, user.id);
        }
      }

      // Update lastLoginAt
      await tx.users.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
        select: { id: true },
      });

      // Create refresh session
      const { rawToken: refreshToken } = await createUserRefreshSession(
        tx,
        user.id,
        now
      );

      const accessToken = generateAccessToken(this.fastify, user.id, user.role);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          image: user.image,
        },
        accessToken,
        refreshToken,
      };
    });

    log.info({ userId: result.user.id }, "user google login success");

    return result;
  }

  /**
   * Refresh access token using refresh token
   * Atomic operation: resolve, revoke old, create new all in one transaction
   */
  async refresh(input: { refreshToken: string }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const { refreshToken } = input;

    if (!refreshToken) {
      throw new BadRequestError("Refresh token is required");
    }

    const now = new Date();

    // Atomic refresh: resolve, revoke old, create new all in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // Resolve refresh session using transaction client
      const sessionData = await resolveUserRefreshSessionByRawToken(
        tx,
        refreshToken,
        now
      );

      if (!sessionData) {
        throw new UnauthorizedError("Invalid or expired refresh token");
      }

      const { user } = sessionData;

      // Rotate refresh token atomically (revoke old, create new)
      const { rawToken: newRefreshToken } = await rotateUserRefreshSessionTx(
        tx,
        refreshToken,
        user.id,
        now
      );

      // Generate new access token
      const accessToken = generateAccessToken(this.fastify, user.id, user.role);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        userId: user.id,
      };
    });

    log.info({ userId: result.userId }, "user token refreshed");

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(input: { refreshToken?: string }): Promise<void> {
    if (input.refreshToken) {
      await revokeUserRefreshSessionByRawToken(prisma, input.refreshToken);
      log.info("user logout (refresh token revoked)");
    }
    // Idempotent: if no token provided, just return success
  }

  /**
   * Change password for email/password users. Invalidates all refresh sessions.
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    if (!user.password) {
      throw new BadRequestError(
        "Cannot change password for accounts using social login"
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      await revokeAllUserRefreshSessionsByUserId(tx, userId);
    });

    log.info({ userId }, "user password changed");
  }
}
