// groups/service/join.ts
// Join group services: joinGroupByCode, joinPublicGroup, generateInviteCode, getInviteCode.

import { randomBytes } from "crypto";
import { prisma } from "@repo/db";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../../../utils/errors/app-error";
import { GROUP_STATUS, MEMBER_STATUS, GROUP_PRIVACY } from "../constants";
import { buildGroupItem } from "../builders";
import { assertGroupExists, assertGroupCreator } from "../permissions";
import { repository as repo } from "../repository";
import { getLogger } from "../../../../logger";
import type { ApiGroupResponse } from "@repo/types";

const log = getLogger("groups.join");

/**
 * Generate a random 8-character hex invite code.
 */
function generateCode(): string {
  return randomBytes(4).toString("hex");
}

/**
 * Generate or regenerate an invite code for a group.
 * Only the group creator can do this. Group must be active.
 */
export async function generateInviteCode(
  groupId: number,
  userId: number
): Promise<{ status: "success"; data: { inviteCode: string }; message: string }> {
  log.info({ groupId, userId }, "generateInviteCode - start");

  const group = await assertGroupCreator(groupId, userId);

  if (group.status !== GROUP_STATUS.ACTIVE) {
    throw new BadRequestError("Invite codes can only be generated for active groups");
  }

  const inviteCode = generateCode();
  await repo.updateGroup(groupId, { inviteCode });

  log.info({ groupId }, "generateInviteCode - success");
  return {
    status: "success",
    data: { inviteCode },
    message: "Invite code generated successfully",
  };
}

/**
 * Get the current invite code for a group.
 * Members can view it. If no code exists and requester is creator, auto-generate.
 */
export async function getInviteCode(
  groupId: number,
  userId: number
): Promise<{ status: "success"; data: { inviteCode: string }; message: string }> {
  log.info({ groupId, userId }, "getInviteCode - start");

  const group = await assertGroupExists(groupId);

  if (group.status !== GROUP_STATUS.ACTIVE) {
    throw new BadRequestError("Group is not active");
  }

  // For private groups, check membership (reuse member for admin_only check below)
  let memberFromCheck: Awaited<ReturnType<typeof repo.findGroupMember>> = null;
  if (group.privacy === GROUP_PRIVACY.PRIVATE && group.creatorId !== userId) {
    memberFromCheck = await repo.findGroupMember(groupId, userId);
    if (!memberFromCheck || memberFromCheck.status !== MEMBER_STATUS.JOINED) {
      throw new ForbiddenError("Only group members can view the invite code");
    }
  }

  // Fetch invite access rule
  const rules = await prisma.groupRules.findUnique({
    where: { groupId },
    select: { inviteAccess: true },
  });

  // If admin_only, check role (creator is always allowed as owner)
  if (rules?.inviteAccess === "admin_only" && group.creatorId !== userId) {
    const member = memberFromCheck ?? (await repo.findGroupMember(groupId, userId));
    if (!member || (member.role !== "admin" && member.role !== "owner")) {
      throw new ForbiddenError("Only admins can share the invite link for this group");
    }
  }

  let inviteCode = group.inviteCode;

  // Auto-generate if creator and no code exists
  if (!inviteCode && group.creatorId === userId) {
    inviteCode = generateCode();
    await repo.updateGroup(groupId, { inviteCode });
  }

  if (!inviteCode) {
    throw new NotFoundError("No invite code available for this group");
  }

  return {
    status: "success",
    data: { inviteCode },
    message: "Invite code retrieved successfully",
  };
}

/**
 * Join a private group using an invite code.
 * Validates: code exists, group active, not already joined, max members.
 */
export async function joinGroupByCode(
  code: string,
  userId: number
): Promise<ApiGroupResponse> {
  log.info({ userId, codeLength: code.length }, "joinGroupByCode - start");

  const group = await repo.findGroupByInviteCode(code);
  if (!group) {
    throw new NotFoundError("Invalid invite code");
  }

  if (group.status !== GROUP_STATUS.ACTIVE) {
    throw new BadRequestError("This group is not accepting new members");
  }

  await validateAndJoin(group.id, userId);

  const data = buildGroupItem(group);
  log.info({ groupId: group.id, userId }, "joinGroupByCode - success");

  return { status: "success", data, message: "Joined group successfully" };
}

/**
 * Join a public group directly (no code needed).
 * Validates: group exists, is public, is active, not already joined, max members.
 */
export async function joinPublicGroup(
  groupId: number,
  userId: number
): Promise<ApiGroupResponse> {
  log.info({ groupId, userId }, "joinPublicGroup - start");

  const group = await assertGroupExists(groupId);

  if (group.privacy !== GROUP_PRIVACY.PUBLIC) {
    throw new ForbiddenError("This group requires an invite code to join");
  }

  if (group.status !== GROUP_STATUS.ACTIVE) {
    throw new BadRequestError("This group is not accepting new members");
  }

  await validateAndJoin(groupId, userId);

  const data = buildGroupItem(group);
  log.info({ groupId, userId }, "joinPublicGroup - success");

  return { status: "success", data, message: "Joined group successfully" };
}

/**
 * Shared validation + join logic for both code and public flows.
 * Checks: not already joined, max members not reached, creates/reactivates member.
 */
async function validateAndJoin(groupId: number, userId: number): Promise<void> {
  // Check if already a member
  const existingMember = await repo.findGroupMember(groupId, userId);
  if (existingMember && existingMember.status === MEMBER_STATUS.JOINED) {
    throw new ConflictError("You are already a member of this group");
  }

  // Check max members (from groupRules)
  const rules = await prisma.groupRules.findUnique({
    where: { groupId },
    select: { maxMembers: true },
  });
  const maxMembers = rules?.maxMembers ?? 50;

  const memberCount = await repo.countGroupMembers(groupId);
  if (memberCount >= maxMembers) {
    throw new BadRequestError("This group has reached its maximum number of members");
  }

  // Create or reactivate member
  if (existingMember) {
    await repo.updateGroupMember(existingMember.id, { status: MEMBER_STATUS.JOINED });
  } else {
    await repo.createGroupMember({
      groupId,
      userId,
      role: "member",
      status: "joined",
    });
  }
}
