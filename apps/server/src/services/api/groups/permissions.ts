// groups/permissions.ts
// Permission checks for groups - explicit assertions.

import { prisma } from "@repo/db";
import { NotFoundError, ForbiddenError } from "../../../utils/errors";
import { MEMBER_STATUS } from "./constants";

/**
 * Assert that a group exists.
 * Throws NotFoundError if group doesn't exist.
 */
export async function assertGroupExists(groupId: number) {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new NotFoundError(`Group with id ${groupId} not found`);
  }

  return group;
}

/**
 * Assert that a user is a group member (creator or joined member).
 * Throws NotFoundError if group doesn't exist.
 * Throws ForbiddenError if group exists but user is not a member.
 */
export async function assertGroupMember(groupId: number, userId: number) {
  const group = await assertGroupExists(groupId);
  const isCreator = group.creatorId === userId;

  if (isCreator) {
    return { group, isCreator: true, isMember: true };
  }

  const member = await prisma.groupMembers.findFirst({
    where: {
      groupId,
      userId,
      status: MEMBER_STATUS.JOINED,
    },
  });

  if (!member) {
    throw new ForbiddenError(`User does not have access to group with id ${groupId}`);
  }

  return { group, isCreator: false, isMember: true };
}

/**
 * Assert that a user is the group creator.
 * Throws NotFoundError if group doesn't exist.
 * Throws ForbiddenError if group exists but user is not the creator.
 */
export async function assertGroupCreator(groupId: number, userId: number) {
  const group = await assertGroupExists(groupId);

  if (group.creatorId !== userId) {
    throw new ForbiddenError(`User is not the creator of group with id ${groupId}`);
  }

  return group;
}
