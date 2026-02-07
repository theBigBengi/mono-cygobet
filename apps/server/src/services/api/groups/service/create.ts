// groups/service/create.ts
// Create group service.

import type {
  ApiGroupResponse,
  ApiCreateGroupBody,
  ApiGroupPrivacy,
} from "@repo/types";
import { getLogger } from "../../../../logger";
import { nowUnixSeconds } from "../../../../utils/dates";
import { resolveGroupName } from "../helpers";
import { SELECTION_MODE } from "../constants";
import { buildGroupItem } from "../builders";
import { repository as repo } from "../repository";

/**
 * Create a new group.
 * Sets default values: status = "draft", privacy = "private" if not provided.
 * If name is not provided or empty, generates automatic name: "$username Draft #N"
 * Creates groupFixtures from fixtureIds (games), or from upcoming fixtures by league/team (leagues/teams).
 */
const log = getLogger("groups.create");

export async function createGroup(
  args: ApiCreateGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  const {
    name,
    description,
    creatorId,
    privacy = "private",
    fixtureIds = [],
    selectionMode = "games",
    teamIds = [],
    leagueIds = [],
    inviteAccess,
  } = args;

  log.info({ creatorId, selectionMode }, "Creating group");

  try {
    // Resolve group name
    const username = await repo.getUserUsername(creatorId);
    const draftCount = await repo.countDraftGroupsByCreator(creatorId);
    const groupName = resolveGroupName(name, username || "User", draftCount);

    // Create group with member and rules in a single transaction
    const selMode = (selectionMode ?? SELECTION_MODE.GAMES) as
      | "games"
      | "teams"
      | "leagues";
    const result = await repo.createGroupWithMemberAndRules({
      name: groupName,
      creatorId,
      privacy: privacy,
      selectionMode: selMode,
      fixtureIds,
      teamIds: selMode === SELECTION_MODE.TEAMS ? (teamIds ?? []) : [],
      leagueIds: selMode === SELECTION_MODE.LEAGUES ? (leagueIds ?? []) : [],
      now: nowUnixSeconds(),
      ...(inviteAccess !== undefined && { inviteAccess }),
      description: description ?? null,
    });

    const data = buildGroupItem(result);

    log.info({ groupId: result.id }, "Group created successfully");

    return {
      status: "success",
      data,
      message: "Group created successfully",
    };
  } catch (error) {
    log.error({ error, args }, "Failed to create group");
    throw error;
  }
}
