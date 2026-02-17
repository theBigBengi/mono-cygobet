// services/api/invites/service.ts
// Group invite business logic: send, list, respond, cancel.

import type {
  ApiSendInviteResponse,
  ApiUserInvitesResponse,
  ApiInviteItem,
  ApiRespondToInviteResponse,
} from "@repo/types";
import { prisma } from "@repo/db";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../../utils/errors/app-error";
import { assertGroupMember } from "../groups/permissions";
import { repository as groupRepo } from "../groups/repository";
import { buildGroupItem } from "../groups/builders";
import { MEMBER_STATUS, GROUP_STATUS } from "../groups/constants";
import * as inviteRepo from "./repository";
import { getLogger } from "../../../logger";
import type { TypedIOServer } from "../../../types/socket";

const log = getLogger("invites.service");
const MAX_PENDING_INVITES_PER_DAY = 5;

/**
 * Send a group invite. Validates group active, inviter is member, invitee not member,
 * no existing pending invite, group not full, inviter under daily limit, invitee allowInvitesFrom.
 * Emits invite:received to user:{inviteeId} via socket.
 */
export async function sendInvite(
  groupId: number,
  inviterId: number,
  inviteeId: number,
  message: string | undefined,
  io?: TypedIOServer
): Promise<ApiSendInviteResponse> {
  await assertGroupMember(groupId, inviterId);

  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    include: { groupRules: { select: { maxMembers: true } } },
  });
  if (!group) throw new NotFoundError("Group not found");
  if (group.status !== GROUP_STATUS.ACTIVE) {
    throw new BadRequestError("Group is not active");
  }

  if (inviteeId === inviterId) {
    throw new BadRequestError("You cannot invite yourself");
  }

  const inviteeProfile = await prisma.userProfiles.findUnique({
    where: { userId: inviteeId },
    select: { allowInvitesFrom: true },
  });
  if (inviteeProfile?.allowInvitesFrom === "nobody") {
    throw new ForbiddenError("This user does not accept invites");
  }

  const existingMember = await groupRepo.findGroupMember(groupId, inviteeId);
  if (existingMember?.status === MEMBER_STATUS.JOINED) {
    throw new ConflictError("User is already a member of this group");
  }

  const pending = await inviteRepo.findPendingByGroupAndInvitee(
    groupId,
    inviteeId
  );
  if (pending) {
    throw new ConflictError("A pending invite already exists for this user");
  }

  const cooldownActive = await inviteRepo.isDeclineCooldownActive(
    groupId,
    inviteeId
  );
  if (cooldownActive) {
    throw new BadRequestError(
      "This user recently declined an invite. Please wait before inviting again."
    );
  }

  const maxMembers = group.groupRules?.maxMembers ?? 50;
  const memberCount = await groupRepo.countGroupMembers(groupId);
  if (memberCount >= maxMembers) {
    throw new BadRequestError(
      "Group has reached its maximum number of members"
    );
  }

  const sentToday = await inviteRepo.countPendingTodayByInviter(inviterId);
  if (sentToday >= MAX_PENDING_INVITES_PER_DAY) {
    throw new BadRequestError(
      "You have reached the maximum number of invites per day"
    );
  }

  const invite = await inviteRepo.createInvite({
    groupId,
    inviterId,
    inviteeId,
    message: message?.slice(0, 200) ?? null,
  });

  const inviter = await prisma.users.findUnique({
    where: { id: inviterId },
    select: { id: true, username: true, image: true },
  });

  if (io) {
    io.to(`user:${inviteeId}`).emit("invite:received", {
      inviteId: invite.id,
      groupId,
      groupName: group.name,
      inviter: {
        id: inviter?.id ?? inviterId,
        username: inviter?.username ?? null,
        image: inviter?.image ?? null,
      },
      message: invite.message ?? null,
      expiresAt: invite.expiresAt.toISOString(),
    });
  }

  log.info(
    { inviteId: invite.id, groupId, inviterId, inviteeId },
    "sendInvite - success"
  );
  return {
    status: "success",
    data: {
      inviteId: invite.id,
      expiresAt: invite.expiresAt.toISOString(),
    },
  };
}

/**
 * Get invites for the current user (invitee). Optionally filter by status.
 */
export async function getMyInvites(
  userId: number,
  statusFilter?: "pending" | "accepted" | "declined" | "expired" | "cancelled"
): Promise<ApiUserInvitesResponse> {
  const rows = await inviteRepo.listByInvitee(userId, statusFilter);
  const inviterIds = [...new Set(rows.map((r) => r.inviterId))];
  const users =
    inviterIds.length > 0
      ? await prisma.users.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, username: true, image: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const invites: ApiInviteItem[] = rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    groupName: r.groups.name,
    inviter: (() => {
      const u = userMap.get(r.inviterId);
      return {
        id: r.inviterId,
        username: u?.username ?? null,
        image: u?.image ?? null,
      };
    })(),
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  const pendingCount = await prisma.groupInvites.count({
    where: {
      inviteeId: userId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });

  return {
    status: "success",
    data: { invites, pendingCount },
  };
}

/**
 * Accept or decline an invite. On accept, add user to group and emit invite:accepted to group room.
 */
export async function respondToInvite(
  inviteId: number,
  userId: number,
  action: "accept" | "decline",
  io?: TypedIOServer
): Promise<
  ApiRespondToInviteResponse | { status: "success"; data?: undefined }
> {
  const row = await inviteRepo.getInviteById(inviteId);
  if (!row) throw new NotFoundError("Invite not found");
  if (row.inviteeId !== userId) throw new ForbiddenError("Not your invite");
  if (row.status !== "pending") {
    throw new BadRequestError("Invite has already been responded to");
  }
  if (row.expiresAt < new Date()) {
    await inviteRepo.updateInviteStatus(inviteId, "expired");
    throw new BadRequestError("Invite has expired");
  }

  if (action === "decline") {
    await inviteRepo.updateInviteStatus(inviteId, "declined");
    return { status: "success" };
  }

  const groupId = row.groupId;
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    include: { groupRules: { select: { maxMembers: true } } },
  });
  if (!group) throw new NotFoundError("Group not found");
  if (group.status !== GROUP_STATUS.ACTIVE) {
    throw new BadRequestError("Group is no longer active");
  }

  const maxMembers = group.groupRules?.maxMembers ?? 50;
  const memberCount = await groupRepo.countGroupMembers(groupId);
  if (memberCount >= maxMembers) {
    throw new BadRequestError(
      "Group has reached its maximum number of members"
    );
  }

  const existingMember = await groupRepo.findGroupMember(groupId, userId);
  if (existingMember?.status === MEMBER_STATUS.JOINED) {
    await inviteRepo.updateInviteStatus(inviteId, "accepted");
    const data = buildGroupItem(group);
    return { status: "success", data };
  }

  await prisma.$transaction(async (tx) => {
    if (existingMember) {
      await tx.groupMembers.update({
        where: { id: existingMember.id },
        data: { status: MEMBER_STATUS.JOINED },
      });
    } else {
      await tx.groupMembers.create({
        data: {
          groupId,
          userId,
          role: "member",
          status: "joined",
        },
      });
    }
    await tx.groupInvites.update({
      where: { id: inviteId },
      data: { status: "accepted", respondedAt: new Date() },
    });
  });

  const invitee = await prisma.users.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (io) {
    io.to(`group:${groupId}`).emit("invite:accepted", {
      groupId,
      userId,
      username: invitee?.username ?? null,
    });
  }

  const data = buildGroupItem(group);
  return { status: "success", data };
}

/**
 * Cancel an invite (inviter only). Emits invite:cancelled to user:{inviteeId}.
 */
export async function cancelInvite(
  groupId: number,
  inviteId: number,
  userId: number,
  io?: TypedIOServer
): Promise<void> {
  const row = await inviteRepo.getInviteById(inviteId);
  if (!row) throw new NotFoundError("Invite not found");
  if (row.groupId !== groupId) throw new NotFoundError("Invite not found");
  if (row.inviterId !== userId)
    throw new ForbiddenError("Only the inviter can cancel");
  if (row.status !== "pending") {
    throw new BadRequestError("Invite can no longer be cancelled");
  }

  const inviteeId = row.inviteeId;
  await inviteRepo.deleteInvite(inviteId);

  if (io) {
    io.to(`user:${inviteeId}`).emit("invite:cancelled", { inviteId });
  }
  log.info({ inviteId, groupId, userId }, "cancelInvite - success");
}
