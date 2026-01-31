// groups/service/members.ts
// Get group members list.

import type { ApiGroupMemberItem, ApiGroupMembersResponse } from "@repo/types";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { getLogger } from "../../../../logger";

const log = getLogger("groups.members");

/**
 * Get group members (joined only).
 * - Verifies that the user is a group member (creator or joined).
 * - Returns list with userId, username, role, joinedAt.
 */
export async function getGroupMembers(
  groupId: number,
  userId: number
): Promise<ApiGroupMembersResponse> {
  log.debug({ groupId, userId }, "getGroupMembers - start");
  await assertGroupMember(groupId, userId);

  const { members, users } = await repo.findGroupMembersWithUsers(groupId);
  const userById = new Map(users.map((u) => [u.id, u.username]));

  const data: ApiGroupMemberItem[] = members.map((m) => ({
    userId: m.userId,
    username: userById.get(m.userId) ?? null,
    role: m.role as "owner" | "admin" | "member",
    joinedAt: m.createdAt.toISOString(),
  }));

  return {
    status: "success",
    data,
    message: "Group members fetched successfully",
  };
}
