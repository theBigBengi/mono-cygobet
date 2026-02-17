// services/api/users/search-users.ts
// Search users by username for group invites. Respects discoverability.

import type { ApiUserSearchItem, ApiUsersSearchResponse } from "@repo/types";
import { prisma } from "@repo/db";
import { getPagination, createPaginationResponse } from "../../../utils/routes";
import type { PaginationQuery } from "../../../utils/routes";

const MIN_QUERY_LENGTH = 3;
const SUGGESTED_USERS_LIMIT = 10;

export interface SearchUsersParams extends PaginationQuery {
  q: string;
  excludeGroupId?: number;
  userId: number;
}

/**
 * Search users by username (ILIKE). Excludes self, respects discoverability.
 * When excludeGroupId is set, excludes users already in that group.
 * isInSharedGroup: true if the searched user shares at least one group (joined) with userId.
 */
export async function searchUsers(
  params: SearchUsersParams
): Promise<ApiUsersSearchResponse> {
  const { q, excludeGroupId, userId, page, perPage } = params;
  const trimmed = q.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return {
      status: "success",
      data: [],
      pagination: {
        page: 1,
        perPage: perPage ?? 20,
        totalItems: 0,
        hasMore: false,
      },
    };
  }

  const { page: p, perPage: pp, skip, take } = getPagination({ page, perPage });

  let excludeUserIds: number[] | undefined;
  if (excludeGroupId != null) {
    const members = await prisma.groupMembers.findMany({
      where: { groupId: excludeGroupId, status: "joined" },
      select: { userId: true },
    });
    excludeUserIds = members.map((m) => m.userId);
  }

  const where: {
    username: { contains: string; mode: "insensitive" };
    id: { not?: number; notIn?: number[] };
    userProfiles?: { some: { discoverability: string } };
  } = {
    username: { contains: trimmed, mode: "insensitive" },
    id: excludeUserIds?.length
      ? { notIn: [userId, ...excludeUserIds] }
      : { not: userId },
    userProfiles: { some: { discoverability: "everyone" } },
  };

  const [users, totalCount] = await Promise.all([
    prisma.users.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
      },
      orderBy: { username: "asc" },
      skip,
      take,
    }),
    prisma.users.count({ where }),
  ]);

  const userIds = users.map((u) => u.id);
  let sharedGroupByUser: Set<number> = new Set();
  if (userIds.length > 0) {
    const myGroupIds = await prisma.groupMembers
      .findMany({
        where: { userId, status: "joined" },
        select: { groupId: true },
      })
      .then((rows) => new Set(rows.map((r) => r.groupId)));
    if (myGroupIds.size > 0) {
      const othersInSameGroups = await prisma.groupMembers.findMany({
        where: {
          groupId: { in: Array.from(myGroupIds) },
          userId: { in: userIds },
          status: "joined",
        },
        select: { userId: true },
      });
      othersInSameGroups.forEach((r) => sharedGroupByUser.add(r.userId));
    }
  }

  const data: ApiUserSearchItem[] = users.map((u) => ({
    id: u.id,
    username: u.username ?? "",
    name: u.name,
    image: u.image,
    isInSharedGroup: sharedGroupByUser.has(u.id),
  }));

  const pagination = createPaginationResponse(p, pp, totalCount);
  return {
    status: "success",
    data,
    pagination: {
      ...pagination,
      hasMore: p * pp < totalCount,
    },
  };
}

export interface SuggestedUsersParams {
  userId: number;
  excludeGroupId?: number;
}

/**
 * Get suggested users - people from private groups the user has been in.
 * Excludes self and optionally excludes members of a specific group.
 */
export async function getSuggestedUsers(
  params: SuggestedUsersParams
): Promise<ApiUsersSearchResponse> {
  const { userId, excludeGroupId } = params;

  // Get all private groups the user is/was a member of
  const myPrivateGroups = await prisma.groupMembers.findMany({
    where: {
      userId,
      groups: {
        is: { privacy: "private" },
      },
    },
    select: { groupId: true },
  });

  const privateGroupIds = myPrivateGroups.map((g) => g.groupId);

  if (privateGroupIds.length === 0) {
    return {
      status: "success",
      data: [],
      pagination: { page: 1, perPage: SUGGESTED_USERS_LIMIT, totalItems: 0, hasMore: false },
    };
  }

  // Get users to exclude (self + optionally current group members)
  let excludeUserIds: number[] = [userId];
  if (excludeGroupId != null) {
    const currentGroupMembers = await prisma.groupMembers.findMany({
      where: { groupId: excludeGroupId, status: "joined" },
      select: { userId: true },
    });
    excludeUserIds = [...excludeUserIds, ...currentGroupMembers.map((m) => m.userId)];
  }

  // Get user IDs from those private groups (excluding self and current group members)
  const suggestedMemberIds = await prisma.groupMembers.findMany({
    where: {
      groupId: { in: privateGroupIds },
      userId: { notIn: excludeUserIds },
      status: "joined",
    },
    select: { userId: true },
    distinct: ["userId"],
    take: SUGGESTED_USERS_LIMIT,
  });

  const userIds = suggestedMemberIds.map((m) => m.userId);

  if (userIds.length === 0) {
    return {
      status: "success",
      data: [],
      pagination: { page: 1, perPage: SUGGESTED_USERS_LIMIT, totalItems: 0, hasMore: false },
    };
  }

  // Fetch user details
  const users = await prisma.users.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
    },
  });

  const data: ApiUserSearchItem[] = users
    .filter((u) => u.username) // Only include users with usernames
    .map((u) => ({
      id: u.id,
      username: u.username ?? "",
      name: u.name,
      image: u.image,
      isInSharedGroup: true, // They're all from shared groups
    }));

  return {
    status: "success",
    data,
    pagination: {
      page: 1,
      perPage: SUGGESTED_USERS_LIMIT,
      totalItems: data.length,
      hasMore: false,
    },
  };
}
