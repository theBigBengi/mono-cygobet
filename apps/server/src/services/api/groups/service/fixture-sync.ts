// groups/service/fixture-sync.ts
// Sync new fixtures to active groups with leagues/teams selection mode.

import { NOT_STARTED_STATES } from "@repo/utils";
import { prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import type { Prisma } from "@repo/db";
import { findFixturesTx } from "../../fixtures/repository";
import {
  buildFixturesByLeaguesWhere,
  buildFixturesByTeamsWhere,
} from "../../fixtures/queries";
import { attachFixturesToGroupInternal } from "../repository/fixtures";
import { GROUP_STATUS, SELECTION_MODE } from "../constants";

export type SyncNewFixturesResult = {
  groupsProcessed: number;
  fixturesAttached: number;
};

/**
 * Sync new fixtures from DB to active groups with leagues/teams selection mode.
 * Finds fixtures that match each group's leagueIds/teamIds and are not yet attached,
 * then attaches them. Only NS (not started) fixtures are synced; started/finished are excluded.
 */
export async function syncNewFixturesToActiveGroups(opts?: {
  dryRun?: boolean;
  signal?: AbortSignal;
}): Promise<SyncNewFixturesResult> {
  const dryRun = !!opts?.dryRun;

  const groupRules = await prisma.groupRules.findMany({
    where: {
      groups: { status: GROUP_STATUS.ACTIVE },
      selectionMode: { in: [SELECTION_MODE.LEAGUES, SELECTION_MODE.TEAMS] },
      OR: [
        { groupLeaguesIds: { isEmpty: false } },
        { groupTeamsIds: { isEmpty: false } },
      ],
    },
    select: {
      groupId: true,
      selectionMode: true,
      groupLeaguesIds: true,
      groupTeamsIds: true,
    },
  });

  let totalFixturesAttached = 0;
  const now = Math.floor(Date.now() / 1000);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const rules of groupRules) {
      if (opts?.signal?.aborted) break;

      const isLeagues = rules.selectionMode === SELECTION_MODE.LEAGUES;
      const leagueIds = rules.groupLeaguesIds ?? [];
      const teamIds = rules.groupTeamsIds ?? [];

      if (isLeagues && leagueIds.length === 0) continue;
      if (!isLeagues && teamIds.length === 0) continue;

      const baseWhere = {
        state: { in: [...NOT_STARTED_STATES] as FixtureState[] },
        startTs: { gt: now },
        externalId: { gte: 0 },
      };
      const where = isLeagues
        ? buildFixturesByLeaguesWhere(baseWhere, leagueIds)
        : buildFixturesByTeamsWhere(baseWhere, teamIds);

      const matchingFixtures = await findFixturesTx(
        tx,
        where,
        { id: true },
        { startTs: "asc" }
      );
      const matchingIds = matchingFixtures.map((f) => f.id);

      const existingGroupFixtures = await tx.groupFixtures.findMany({
        where: { groupId: rules.groupId },
        select: { fixtureId: true },
      });
      const existingIds = new Set(
        existingGroupFixtures.map((gf) => gf.fixtureId)
      );

      const newFixtureIds = matchingIds.filter((id) => !existingIds.has(id));

      if (newFixtureIds.length > 0 && !dryRun) {
        await attachFixturesToGroupInternal(tx, rules.groupId, newFixtureIds);
        totalFixturesAttached += newFixtureIds.length;
      } else if (newFixtureIds.length > 0 && dryRun) {
        totalFixturesAttached += newFixtureIds.length;
      }
    }
  });

  return {
    groupsProcessed: groupRules.length,
    fixturesAttached: totalFixturesAttached,
  };
}
