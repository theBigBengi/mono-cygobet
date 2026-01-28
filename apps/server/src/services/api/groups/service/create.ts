// groups/service/create.ts
// Create group service.

import type {
  ApiGroupResponse,
  ApiCreateGroupBody,
  ApiGroupPrivacy,
} from "@repo/types";
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
export async function createGroup(
  args: ApiCreateGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  const {
    name,
    creatorId,
    privacy = "private",
    fixtureIds = [],
    selectionMode = "games",
    teamIds = [],
    leagueIds = [],
  } = args;

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
    teamIds: selMode === SELECTION_MODE.TEAMS ? teamIds ?? [] : [],
    leagueIds: selMode === SELECTION_MODE.LEAGUES ? leagueIds ?? [] : [],
    now: nowUnixSeconds(),
  });

  const data = buildGroupItem(result);

  return {
    status: "success",
    data,
    message: "Group created successfully",
  };
}
