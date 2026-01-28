// groups/validators/group-validators.ts
// Validation functions for groups service.

import { BadRequestError } from "../../../../utils/errors";
import type { GroupsRepository } from "../repository/interface";

/**
 * Validate that all fixtureIds belong to the specified group.
 * Throws BadRequestError if any fixtures are missing.
 * Returns the group fixtures that were fetched for validation.
 *
 * @param groupId - Group ID to validate against
 * @param fixtureIds - Array of fixture IDs to validate
 * @param repo - Groups repository instance
 * @returns Array of group fixtures that belong to the group
 * @throws BadRequestError if one or more fixtures do not belong to the group
 */
export async function validateFixtureIdsBelongToGroup(
  groupId: number,
  fixtureIds: number[],
  repo: GroupsRepository
): Promise<Array<{ id: number; groupId: number; fixtureId: number }>> {
  const groupFixtures = await repo.findGroupFixturesByFixtureIds(
    groupId,
    fixtureIds
  );

  if (groupFixtures.length !== fixtureIds.length) {
    throw new BadRequestError(
      `One or more fixtures do not belong to group ${groupId}`
    );
  }

  return groupFixtures;
}
