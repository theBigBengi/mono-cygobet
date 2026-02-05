// groups/service/discover.ts
// Public group discovery: list and search public active groups.

import type {
  ApiPublicGroupsQuery,
  ApiPublicGroupItem,
  ApiPublicGroupsResponse,
} from "@repo/types";
import { prisma } from "@repo/db";
import { nowUnixSeconds } from "../../../../utils/dates";
import { repository as repo } from "../repository";

/**
 * Get paginated list of public active groups, excluding groups the user is already in.
 * Optional case-insensitive search by group name.
 */
export async function getPublicGroups(
  query: ApiPublicGroupsQuery,
  userId: number
): Promise<ApiPublicGroupsResponse> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(100, Math.max(1, query.perPage ?? 20));
  const search = query.search?.trim();

  const { groups, totalCount } = await repo.findPublicGroupsPaginated({
    page,
    perPage,
    search: search || undefined,
    excludeUserId: userId,
  });

  if (groups.length === 0) {
    return {
      status: "success",
      data: [],
      pagination: {
        page,
        perPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / perPage) || 1,
      },
    };
  }

  const groupIds = groups.map((g) => g.id);
  const now = nowUnixSeconds();
  const stats = await repo.findGroupsStatsBatch(groupIds, userId, now);

  const creatorIds = [...new Set(groups.map((g) => g.creatorId))];
  const users = await prisma.users.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, username: true },
  });
  const creatorUsernameByUserId = new Map(users.map((u) => [u.id, u.username]));

  const data: ApiPublicGroupItem[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: stats.memberCountByGroupId.get(g.id) ?? 0,
    maxMembers: g.groupRules?.maxMembers ?? null,
    totalFixtures: stats.fixtureCountByGroupId.get(g.id) ?? 0,
    creatorUsername: creatorUsernameByUserId.get(g.creatorId) ?? null,
    createdAt: g.createdAt.toISOString(),
  }));

  return {
    status: "success",
    data,
    pagination: {
      page,
      perPage,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / perPage),
    },
  };
}
