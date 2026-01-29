// groups/service/update.ts
// Update group services (updateGroup, publishGroup).

import type {
  ApiGroupResponse,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiGroupPrivacy,
} from "@repo/types";
import type { Prisma } from "@repo/db";
import type { groupPredictionMode, groupKoRoundMode } from "@repo/db";
import { BadRequestError } from "../../../../utils/errors";
import { GROUP_STATUS } from "../constants";
import { buildGroupItem } from "../builders";
import { assertGroupCreator } from "../permissions";
import { repository as repo } from "../repository";
import { getLogger } from "../../../../logger";

const log = getLogger("groups.update");

/**
 * Update a group.
 * Verifies that the user is the creator.
 * Only updates fields that are provided.
 * Returns 404 if group doesn't exist or user is not the creator.
 */
export async function updateGroup(
  id: number,
  args: ApiUpdateGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  log.debug({ id, args: { ...args, fixtureIds: undefined } }, "updateGroup - start");
  const { creatorId, name, privacy, fixtureIds } = args;

  // Verify group exists and user is creator
  await assertGroupCreator(id, creatorId);

  // Build update data
  const updateData: Prisma.groupsUpdateInput = {};

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (privacy !== undefined) {
    updateData.privacy = privacy;
  }

  // Update the group and groupFixtures in a single transaction
  const group = await repo.updateGroupWithFixtures(id, updateData, fixtureIds);

  const data = buildGroupItem(group);
  log.info({ id, creatorId }, "updateGroup - success");
  return {
    status: "success",
    data,
    message: "Group updated successfully",
  };
}

/**
 * Publish a group (change status from "draft" to "active" and update name/privacy/rules).
 * - Verifies that the user is the creator.
 * - Verifies that the group is in "draft" status.
 * - Updates status to "active" and optionally updates name, privacy, and groupRules.
 * - Returns 404 if group doesn't exist or user is not the creator.
 * - Returns error if group is not in "draft" status.
 */
export async function publishGroup(
  id: number,
  args: ApiPublishGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  log.debug({ id, args: { ...args, predictionMode: undefined, koRoundMode: undefined } }, "publishGroup - start");
  const {
    creatorId,
    name,
    privacy,
    onTheNosePoints,
    correctDifferencePoints,
    outcomePoints,
    predictionMode,
    koRoundMode,
  } = args;

  // 1. Business validations
  // Verify group exists and user is creator
  const existingGroup = await assertGroupCreator(id, creatorId);

  // Verify group is in draft status
  if (existingGroup.status !== GROUP_STATUS.DRAFT) {
    throw new BadRequestError(
      `Group with id ${id} cannot be published. Only draft groups can be published.`
    );
  }

  // 2. Build data for repository
  const publishData = {
    groupId: id,
    status: GROUP_STATUS.ACTIVE as typeof GROUP_STATUS.ACTIVE,
    ...(name !== undefined && { name: name.trim() }),
    ...(privacy !== undefined && { privacy }),
    ...(onTheNosePoints !== undefined && { onTheNosePoints }),
    ...(correctDifferencePoints !== undefined && {
      correctDifferencePoints,
    }),
    ...(outcomePoints !== undefined && { outcomePoints }),
    ...(predictionMode !== undefined && {
      predictionMode: predictionMode as groupPredictionMode,
    }),
    ...(koRoundMode !== undefined && { koRoundMode: koRoundMode as groupKoRoundMode }),
  };

  // 3. Call repository to perform all updates in a single transaction
  const group = await repo.publishGroupInternal(publishData);

  // 4. Build and return response
  const data = buildGroupItem(group);
  log.info({ id, creatorId }, "publishGroup - success");

  return {
    status: "success",
    data,
    message: "Group published successfully",
  };
}
