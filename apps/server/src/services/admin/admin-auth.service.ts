// src/services/admin/admin-auth.service.ts
import type { FastifyInstance } from "fastify";
import * as bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { getLogger } from "../../logger";

const log = getLogger("AdminAuth");
import { ADMIN_ROLE } from "../../constants/roles.constants";
import {
  adminSessionDb,
  computeAdminSessionExpiry,
  generateAdminSessionToken,
  hashAdminSessionToken,
} from "../../auth/admin-session";
import { ADMIN_SESSION_MAX_CONCURRENT } from "../../constants/admin-auth.constants";

export class AdminAuthService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Helper for future extensibility (admin/user provisioning).
   * Not used by the admin login flow directly.
   */
  async hashPassword(plain: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plain, saltRounds);
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ rawSessionToken: string; expires: Date; userId: number }> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    const user = await prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, password: true },
    });

    // Avoid user enumeration: keep errors consistent.
    const invalid = () => new UnauthorizedError("Invalid email or password");

    if (!user) throw invalid();
    if (user.role !== ADMIN_ROLE) throw invalid();
    if (!user.password) throw invalid();

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw invalid();

    const now = new Date();

    const rawSessionToken = generateAdminSessionToken();
    const tokenHash = hashAdminSessionToken(rawSessionToken);
    const expires = computeAdminSessionExpiry(now);

    // Enforce concurrent session limits atomically.
    // Strategy: interactive transaction that:
    // 1) finds active sessions for the user ordered by oldest first
    // 2) if count >= MAX -> delete oldest sessions to make room
    // 3) create new session and update lastLoginAt
    const maxConcurrent = ADMIN_SESSION_MAX_CONCURRENT;

    const created = await prisma.$transaction(async (tx) => {
      // Find current active sessions (not expired)
      const active = await tx.sessions.findMany({
        where: { userId: user.id, expires: { gt: now } },
        orderBy: { id: "asc" },
        select: { id: true },
      });

      if (active.length >= maxConcurrent) {
        const numToRemove = active.length - maxConcurrent + 1;
        const idsToRemove = active.slice(0, numToRemove).map((s) => s.id);
        await tx.sessions.deleteMany({ where: { id: { in: idsToRemove } } });
      }

      const sessionRow = await tx.sessions.create({
        data: { userId: user.id, sessionToken: tokenHash, expires },
        select: { id: true },
      });

      await tx.users.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
        select: { id: true },
      });

      return sessionRow;
    });

    log.info({ userId: user.id }, "admin login success");

    return { rawSessionToken, expires, userId: user.id };
  }

  async logout(rawSessionToken: string | undefined): Promise<void> {
    await adminSessionDb.deleteByRawToken(rawSessionToken);
  }

  /**
   * Update admin user profile (name)
   */
  async updateProfile(
    userId: number,
    input: { name?: string | null }
  ): Promise<{ id: number; email: string; role: string; name: string | null }> {
    const name = input.name?.trim() || null;

    const user = await prisma.users.update({
      where: { id: userId },
      data: { name },
      select: { id: true, email: true, role: true, name: true },
    });

    log.info({ userId }, "admin profile updated");

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
    };
  }

  /**
   * Change admin user password
   */
  async changePassword(
    userId: number,
    input: { currentPassword: string; newPassword: string },
    client: Pick<typeof prisma, "users"> = prisma
  ): Promise<void> {
    const { currentPassword, newPassword } = input;

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters");
    }

    const user = await client.users.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedError("User not found or has no password");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const newPasswordHash = await this.hashPassword(newPassword);

    await client.users.update({
      where: { id: userId },
      data: { password: newPasswordHash },
      select: { id: true },
    });

    log.info({ userId }, "admin password changed");
  }
}
