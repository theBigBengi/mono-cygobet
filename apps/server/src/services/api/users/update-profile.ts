// services/api/users/update-profile.ts
// Update current user profile (username, name, image).

import type { PrismaClient } from "@repo/db";
import type { ApiUserProfileResponse } from "@repo/types";
import { ConflictError } from "../../../utils/errors/app-error";

export type UpdateProfileData = {
  username?: string;
  name?: string;
  image?: string | null;
};

export async function updateProfile(
  prisma: PrismaClient,
  userId: number,
  data: UpdateProfileData
): Promise<ApiUserProfileResponse> {
  if (data.username !== undefined) {
    const existing = await prisma.users.findFirst({
      where: {
        username: data.username,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError("Username already taken");
    }
  }

  const updateData: {
    username?: string;
    name?: string;
    image?: string | null;
  } = {};
  if (data.username !== undefined) updateData.username = data.username;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.image !== undefined) updateData.image = data.image;

  const user = await prisma.users.update({
    where: { id: userId },
    data: updateData,
    include: { userProfiles: true },
  });

  const profileRow = user.userProfiles[0];
  if (!profileRow) {
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
      level: profileRow.level,
      dailyStreak: profileRow.dailyStreak,
      lastClaimAt: profileRow.lastClaimAt
        ? profileRow.lastClaimAt.toISOString()
        : null,
      favouriteTeamId: profileRow.favouriteTeamId ?? null,
      favouriteLeagueId: profileRow.favouriteLeagueId ?? null,
      onboardingDone: profileRow.onboardingDone,
    },
  };

  return response;
}
