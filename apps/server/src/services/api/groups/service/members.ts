// groups/service/members.ts
// Get group members list, leave group.

import type { ApiGroupMemberItem, ApiGroupMembersResponse } from "@repo/types";
import { assertGroupMember, assertGroupExists } from "../permissions";
import { repository as repo } from "../repository";
import { MEMBER_STATUS } from "../constants";
import { NotFoundError, ForbiddenError } from "../../../../utils/errors";
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

/**
 * Leave a group.
 * - User must be a member but NOT the creator.
 * - Updates member status to "left".
 * - Throws ForbiddenError if user is creator.
 * - Throws NotFoundError if not a member.
 */
export async function leaveGroup(
  groupId: number,
  userId: number
): Promise<{ success: boolean }> {
  log.debug({ groupId, userId }, "leaveGroup - start");

  const group = await assertGroupExists(groupId);
  if (group.creatorId === userId) {
    throw new ForbiddenError(
      "Group creators cannot leave. Transfer ownership or delete the group."
    );
  }

  const member = await repo.findGroupMember(groupId, userId);
  if (!member || member.status !== MEMBER_STATUS.JOINED) {
    throw new NotFoundError(
      `User is not a member of group with id ${groupId} or has already left`
    );
  }

  await repo.updateGroupMember(member.id, { status: MEMBER_STATUS.LEFT });
  log.info({ groupId, userId }, "leaveGroup - success");
  return { success: true };
}
