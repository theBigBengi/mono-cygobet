// src/services/auth/user-auth.service.ts
import type { FastifyInstance } from "fastify";
import * as bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@repo/db";
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from "../../utils/errors";
import { USER_ROLE } from "../../constants/roles.constants";
import { generateAccessToken } from "../../auth/user-tokens";
import {
  createUserRefreshSession,
  resolveUserRefreshSessionByRawToken,
  rotateUserRefreshSessionTx,
  revokeUserRefreshSessionByRawToken,
} from "../../auth/user-refresh-session";

export class UserAuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(private fastify: FastifyInstance) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

  /**
   * Hash password using bcrypt (12 rounds)
   */
  async hashPassword(plain: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plain, saltRounds);
  }

  /**
   * Register a new user with email/username/password
   */
  async register(input: {
    email: string;
    username: string;
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
    const username = input.username?.trim();
    const password = input.password;
    const name = input.name?.trim() || null;

    if (!email || !username || !password) {
      throw new BadRequestError("Email, username, and password are required");
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

    // Check if username already exists
    const existingUsername = await prisma.users.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUsername) {
      throw new ConflictError("Username already taken");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    const now = new Date();

    // Create user and refresh session in transaction
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

      const { rawToken: refreshToken } = await createUserRefreshSession(
        tx,
        user.id,
        now
      );

      const accessToken = generateAccessToken(
        this.fastify,
        user.id,
        user.role,
        user.username
      );

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

    this.fastify.log.info({ userId: result.user.id }, "user registered");

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

    // Create refresh session and update lastLoginAt in transaction
    const result = await prisma.$transaction(async (tx) => {
      const { rawToken: refreshToken } = await createUserRefreshSession(
        tx,
        user.id,
        now
      );

      await tx.users.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
        select: { id: true },
      });

      const accessToken = generateAccessToken(
        this.fastify,
        user.id,
        user.role,
        user.username
      );

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

    this.fastify.log.info({ userId: user.id }, "user login success");

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
      const ticket = await this.googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: process.env.GOOGLE_CLIENT_ID!,
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

      const accessToken = generateAccessToken(
        this.fastify,
        user.id,
        user.role,
        user.username
      );

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

    this.fastify.log.info(
      { userId: result.user.id },
      "user google login success"
    );

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
      const accessToken = generateAccessToken(
        this.fastify,
        user.id,
        user.role,
        user.username
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        userId: user.id,
      };
    });

    this.fastify.log.info({ userId: result.userId }, "user token refreshed");

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
      this.fastify.log.info({}, "user logout (refresh token revoked)");
    }
    // Idempotent: if no token provided, just return success
  }
}
