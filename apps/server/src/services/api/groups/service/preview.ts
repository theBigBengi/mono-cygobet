// groups/service/preview.ts
// Simulates fixture resolution and returns summary stats (no group created).

import { prisma } from "@repo/db";
import {
  buildUpcomingFixturesWhere,
  buildFixturesByLeaguesWhere,
  buildFixturesByTeamsWhere,
} from "../../fixtures/queries";
import { findFixtures } from "../../fixtures/repository";
import type { ApiGroupPreviewResponse } from "@repo/types";

const select = {
  id: true,
  startTs: true,
  leagueId: true,
  homeTeamId: true,
  awayTeamId: true,
} as const;

type FixtureRow = {
  id: number;
  startTs: number;
  leagueId: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
};

export async function getGroupPreview(params: {
  selectionMode: "games" | "teams" | "leagues";
  fixtureIds?: number[];
  teamIds?: number[];
  leagueIds?: number[];
}): Promise<ApiGroupPreviewResponse> {
  const {
    selectionMode,
    fixtureIds = [],
    teamIds = [],
    leagueIds = [],
  } = params;
  const now = Math.floor(Date.now() / 1000);

  let fixtures: FixtureRow[];

  if (selectionMode === "games" && fixtureIds.length > 0) {
    fixtures = await prisma.fixtures.findMany({
      where: { id: { in: fixtureIds } },
      select,
    });
  } else if (selectionMode === "leagues" && leagueIds.length > 0) {
    const baseWhere = buildUpcomingFixturesWhere({ now });
    const where = buildFixturesByLeaguesWhere(baseWhere, leagueIds);
    fixtures = (await findFixtures(where, select, {
      startTs: "asc",
    })) as FixtureRow[];
  } else if (selectionMode === "teams" && teamIds.length > 0) {
    const baseWhere = buildUpcomingFixturesWhere({ now });
    const where = buildFixturesByTeamsWhere(baseWhere, teamIds);
    fixtures = (await findFixtures(where, select, {
      startTs: "asc",
    })) as FixtureRow[];
  } else {
    fixtures = [];
  }

  const fixtureCount = fixtures.length;

  const leagueIdsSet = new Set(
    fixtures.map((f) => f.leagueId).filter((id): id is number => id != null)
  );
  const leagueCount = leagueIdsSet.size;

  const teamIdsSet = new Set<number>();
  for (const f of fixtures) {
    if (f.homeTeamId != null) teamIdsSet.add(f.homeTeamId);
    if (f.awayTeamId != null) teamIdsSet.add(f.awayTeamId);
  }
  const teamCount = teamIdsSet.size;

  let startDate: string | null = null;
  let endDate: string | null = null;
  if (fixtures.length > 0) {
    const timestamps = fixtures.map((f) => f.startTs);
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    startDate = new Date(minTs * 1000).toISOString();
    endDate = new Date(maxTs * 1000).toISOString();
  }

  return {
    status: "success",
    data: {
      fixtureCount,
      leagueCount,
      teamCount,
      startDate,
      endDate,
    },
  };
}
