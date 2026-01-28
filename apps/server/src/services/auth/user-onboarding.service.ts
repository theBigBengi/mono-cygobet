// src/services/auth/user-onboarding.service.ts
import type { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("UserOnboarding");
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "../../utils/errors/app-error";
import {
  isOnboardingRequired,
  completeOnboarding,
} from "../../auth/user-onboarding";

export class UserOnboardingService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Complete onboarding by setting username and marking onboarding as done
   * Validates username uniqueness and format
   * Updates username and profile in a single transaction
   */
  async completeOnboarding(
    userId: number,
    username: string
  ): Promise<{ success: true }> {
    const trimmedUsername = username?.trim();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      throw new BadRequestError("Username must be at least 3 characters long");
    }

    if (trimmedUsername.length > 50) {
      throw new BadRequestError("Username must be at most 50 characters long");
    }

    // Validate username format - allow Hebrew, English letters, numbers, underscore, hyphen
    // Hebrew Unicode range: \u0590-\u05FF
    // English letters: a-zA-Z
    // Numbers: 0-9
    // Special: _-
    const usernameRegex = /^[\u0590-\u05FFa-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      throw new BadRequestError(
        "Username can only contain Hebrew/English letters, numbers, underscores, and hyphens"
      );
    }

    const now = new Date();

    // Update username and complete onboarding in a single transaction
    await prisma.$transaction(async (tx) => {
      // Check if username is already taken
      const existingUser = await tx.users.findUnique({
        where: { username: trimmedUsername },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Username already taken");
      }

      // Update username
      await tx.users.update({
        where: { id: userId },
        data: { username: trimmedUsername },
        select: { id: true },
      });

      // Complete onboarding
      await completeOnboarding(tx, userId, now);
    });

    log.info({ userId }, "user onboarding completed");

    return { success: true };
  }
}
