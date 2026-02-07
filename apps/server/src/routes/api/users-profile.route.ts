import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { ensureUserProfile } from "../../auth/user-onboarding";
import {
  userProfileResponseSchema,
  updateProfileBodySchema,
} from "../../schemas/user-profile.schemas";
import type { ApiUserProfileResponse } from "@repo/types";
import { updateProfile } from "../../services/api/users/update-profile";

type UpdateProfileBody = {
  username?: string;
  name?: string;
  image?: string | null;
};

const userProfileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Reply: ApiUserProfileResponse }>(
    "/users/profile",
    {
      schema: {
        response: { 200: userProfileResponseSchema },
      },
      preHandler: [fastify.userAuth.requireOnboardingComplete],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      const userId = ctx.user.id;

      // Defensive: ensure profile exists
      await ensureUserProfile(prisma, userId);

      const user = await prisma.users.findUnique({
        where: { id: userId },
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
        throw new Error("User not found");
      }

      const profile = await prisma.userProfiles.findUnique({
        where: { userId },
        select: {
          level: true,
          dailyStreak: true,
          lastClaimAt: true,
          favouriteTeamId: true,
          favouriteLeagueId: true,
          onboardingDone: true,
        },
      });

      if (!profile) {
        throw new Error("User profile not found");
      }

      const response: ApiUserProfileResponse = {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          image: user.image,
          role: user.role,
        },
        profile: {
          level: profile.level,
          dailyStreak: profile.dailyStreak,
          lastClaimAt: profile.lastClaimAt
            ? profile.lastClaimAt.toISOString()
            : null,
          favouriteTeamId: profile.favouriteTeamId ?? null,
          favouriteLeagueId: profile.favouriteLeagueId ?? null,
          onboardingDone: profile.onboardingDone,
        },
      };

      return reply.send(response);
    }
  );

  fastify.patch<{
    Body: UpdateProfileBody;
    Reply: ApiUserProfileResponse;
  }>(
    "/users/profile",
    {
      schema: {
        body: updateProfileBodySchema,
        response: { 200: userProfileResponseSchema },
      },
      preHandler: [fastify.userAuth.requireOnboardingComplete],
    },
    async (req, reply) => {
      const ctx = req.userAuth;
      if (!ctx) throw new Error("User auth context missing");

      const data: UpdateProfileBody = {};
      if (req.body.username !== undefined) data.username = req.body.username;
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.image !== undefined) data.image = req.body.image;

      if (Object.keys(data).length === 0) {
        // No updates: fetch and return current profile (same as GET)
        await ensureUserProfile(prisma, ctx.user.id);
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
        const profile = await prisma.userProfiles.findUnique({
          where: { userId: ctx.user.id },
          select: {
            level: true,
            dailyStreak: true,
            lastClaimAt: true,
            favouriteTeamId: true,
            favouriteLeagueId: true,
            onboardingDone: true,
          },
        });
        if (!profile) throw new Error("User profile not found");
        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            image: user.image,
            role: user.role,
          },
          profile: {
            level: profile.level,
            dailyStreak: profile.dailyStreak,
            lastClaimAt: profile.lastClaimAt
              ? profile.lastClaimAt.toISOString()
              : null,
            favouriteTeamId: profile.favouriteTeamId ?? null,
            favouriteLeagueId: profile.favouriteLeagueId ?? null,
            onboardingDone: profile.onboardingDone,
          },
        });
      }

      const result = await updateProfile(prisma, ctx.user.id, data);
      return reply.send(result);
    }
  );
};

export default userProfileRoutes;
