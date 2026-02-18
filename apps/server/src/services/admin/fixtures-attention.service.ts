/**
 * Fixtures Attention Service
 * --------------------------
 * Returns server-side filtered + paginated fixtures that need admin attention.
 * Issue types: stuck (LIVE not updated), overdue (NS past start time),
 * noScores (finished without scores), unsettled (finished with unsettled predictions).
 */

import { prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import type {
  FixtureIssueType,
  AdminFixtureAttentionItem,
  AdminFixturesAttentionResponse,
} from "@repo/types";
import { LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { nowUnixSeconds } from "../../utils/dates";

const LIVE_STATES_ARR = [...LIVE_STATES] as FixtureState[];
const FINISHED_STATES_ARR = [...FINISHED_STATES] as FixtureState[];

const STUCK_THRESHOLD_MS = 3 * 60 * 60 * 1000; // 3 hours

// Shared select shape for fixture queries
const FIXTURE_SELECT = {
  id: true,
  name: true,
  externalId: true,
  startIso: true,
  startTs: true,
  state: true,
  result: true,
  homeScore90: true,
  awayScore90: true,
  updatedAt: true,
  homeTeam: { select: { id: true, name: true, imagePath: true } },
  awayTeam: { select: { id: true, name: true, imagePath: true } },
  league: { select: { id: true, name: true, imagePath: true } },
} as const;

type FixtureRow = {
  id: number;
  name: string;
  externalId: bigint;
  startIso: string;
  startTs: number;
  state: string;
  result: string | null;
  homeScore90: number | null;
  awayScore90: number | null;
  updatedAt: Date;
  homeTeam: { id: number; name: string; imagePath: string | null } | null;
  awayTeam: { id: number; name: string; imagePath: string | null } | null;
  league: { id: number; name: string; imagePath: string | null } | null;
};

// Lightweight item — fixture row + issue metadata, without group/prediction counts
type LightItem = FixtureRow & {
  issueType: FixtureIssueType;
  issueLabel: string;
  issueSince: string;
};

export interface FixturesAttentionParams {
  issueType?: FixtureIssueType | "all";
  page?: number;
  perPage?: number;
}

export async function getFixturesNeedingAttention(
  params: FixturesAttentionParams = {}
): Promise<AdminFixturesAttentionResponse> {
  const { issueType = "all", page = 1, perPage = 25 } = params;

  // 1. Fetch ALL lightweight rows from every category (parallel, no take limit)
  const allCategories: FixtureIssueType[] = ["stuck", "unsettled", "overdue", "noScores"];
  const allResults = await Promise.all(
    allCategories.map((cat) => fetchLightRows(cat))
  );

  // 2. Merge and deduplicate (priority: stuck > unsettled > overdue > noScores)
  const seen = new Set<number>();
  const allItems: LightItem[] = [];

  for (const items of allResults) {
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allItems.push(item);
      }
    }
  }

  // 3. Compute issue counts from the COMPLETE deduplicated list
  const issueCounts = { stuck: 0, overdue: 0, noScores: 0, unsettled: 0 };
  for (const item of allItems) {
    issueCounts[item.issueType]++;
  }

  // 4. Filter to requested category
  const filtered =
    issueType === "all"
      ? allItems
      : allItems.filter((item) => item.issueType === issueType);

  // 5. Sort: critical issues first (stuck > unsettled > overdue > noScores), then oldest first
  const priorityOrder: Record<FixtureIssueType, number> = {
    stuck: 0,
    unsettled: 1,
    overdue: 2,
    noScores: 3,
  };
  filtered.sort((a, b) => {
    const pDiff = priorityOrder[a.issueType] - priorityOrder[b.issueType];
    if (pDiff !== 0) return pDiff;
    return new Date(a.issueSince).getTime() - new Date(b.issueSince).getTime();
  });

  // 6. Paginate
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const offset = (page - 1) * perPage;
  const pageSlice = filtered.slice(offset, offset + perPage);

  // 7. Hydrate ONLY the current page items with group/prediction counts
  const pageItems = await Promise.all(pageSlice.map(hydrateItem));

  return {
    status: "success",
    data: pageItems,
    issueCounts,
    pagination: { page, perPage, totalItems, totalPages },
    message: `Found ${totalItems} fixture(s) needing attention`,
  };
}

// ── Lightweight fetch (no take limit, no extra queries per row) ──────

async function fetchLightRows(
  issueType: FixtureIssueType
): Promise<LightItem[]> {
  switch (issueType) {
    case "stuck":
      return fetchStuckLight();
    case "overdue":
      return fetchOverdueLight();
    case "noScores":
      return fetchNoScoresLight();
    case "unsettled":
      return fetchUnsettledLight();
  }
}

async function fetchStuckLight(): Promise<LightItem[]> {
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
  const rows = await prisma.fixtures.findMany({
    where: {
      externalId: { gte: 0 },
      state: { in: LIVE_STATES_ARR },
      updatedAt: { lt: stuckCutoff },
    },
    select: FIXTURE_SELECT,
    orderBy: { updatedAt: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    issueType: "stuck" as const,
    issueLabel: "Stuck LIVE",
    issueSince: r.updatedAt.toISOString(),
  }));
}

async function fetchOverdueLight(): Promise<LightItem[]> {
  const nowTs = nowUnixSeconds();
  const rows = await prisma.fixtures.findMany({
    where: {
      externalId: { gte: 0 },
      state: "NS",
      startTs: { lt: nowTs },
    },
    select: FIXTURE_SELECT,
    orderBy: { startTs: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    issueType: "overdue" as const,
    issueLabel: "Overdue NS",
    issueSince: r.startIso,
  }));
}

async function fetchNoScoresLight(): Promise<LightItem[]> {
  const rows = await prisma.fixtures.findMany({
    where: {
      externalId: { gte: 0 },
      state: { in: FINISHED_STATES_ARR },
      OR: [{ homeScore90: null }, { awayScore90: null }],
    },
    select: FIXTURE_SELECT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    ...r,
    issueType: "noScores" as const,
    issueLabel: "No Scores",
    issueSince: r.updatedAt.toISOString(),
  }));
}

async function fetchUnsettledLight(): Promise<LightItem[]> {
  const gfRows = await prisma.groupPredictions.findMany({
    where: { settledAt: null },
    select: { groupFixtureId: true },
    distinct: ["groupFixtureId"],
  });
  if (gfRows.length === 0) return [];

  const gfIds = gfRows.map((r) => r.groupFixtureId);
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { id: { in: gfIds } },
    select: { fixtureId: true },
  });
  const fixtureIds = [...new Set(groupFixtures.map((gf) => gf.fixtureId))];
  if (fixtureIds.length === 0) return [];

  const rows = await prisma.fixtures.findMany({
    where: {
      id: { in: fixtureIds },
      externalId: { gte: 0 },
      state: { in: FINISHED_STATES_ARR },
    },
    select: FIXTURE_SELECT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    ...r,
    issueType: "unsettled" as const,
    issueLabel: "Unsettled",
    issueSince: r.updatedAt.toISOString(),
  }));
}

// ── Hydrate a single item with group/prediction counts (expensive) ───

async function hydrateItem(
  row: LightItem
): Promise<AdminFixtureAttentionItem> {
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId: row.id },
    select: { id: true, groupId: true },
  });
  const groupCount = new Set(groupFixtures.map((gf) => gf.groupId)).size;
  const gfIds = groupFixtures.map((gf) => gf.id);
  const predictionCount =
    gfIds.length > 0
      ? await prisma.groupPredictions.count({
          where: { groupFixtureId: { in: gfIds } },
        })
      : 0;

  return {
    id: row.id,
    name: row.name,
    externalId: row.externalId.toString(),
    startIso: row.startIso,
    startTs: row.startTs,
    state: row.state,
    result: row.result,
    homeScore90: row.homeScore90,
    awayScore90: row.awayScore90,
    issueType: row.issueType,
    issueLabel: row.issueLabel,
    issueSince: row.issueSince,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    league: row.league,
    groupCount,
    predictionCount,
  };
}
