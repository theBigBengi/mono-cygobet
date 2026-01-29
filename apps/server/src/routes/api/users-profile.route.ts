import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { ensureUserProfile, isOnboardingRequired } from "../../auth/user-onboarding";
import { userProfileResponseSchema } from "../../schemas/user-profile.schemas";
import type { ApiUserProfileResponse } from "@repo/types";

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
};

console.log("REGISTERING userProfileRoutes");
export default userProfileRoutes;
