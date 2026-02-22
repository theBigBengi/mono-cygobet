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

const STUCK_THRESHOLD_SECONDS = 3 * 60 * 60; // 3 hours — game started > 3h ago and still LIVE

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
  lastProviderState: true,
  lastProviderCheckAt: true,
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
  lastProviderState: string | null;
  lastProviderCheckAt: Date | null;
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

export type AttentionTimeframe = "1h" | "3h" | "6h" | "12h" | "24h" | "24h+" | "all";

export interface FixturesAttentionParams {
  issueType?: FixtureIssueType | "all";
  search?: string;
  timeframe?: AttentionTimeframe;
  leagueId?: number;
  page?: number;
  perPage?: number;
}

export async function getFixturesNeedingAttention(
  params: FixturesAttentionParams = {}
): Promise<AdminFixturesAttentionResponse> {
  const { issueType = "all", search, timeframe = "all", leagueId, page = 1, perPage = 25 } = params;
  const searchLower = search?.trim().toLowerCase();

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

  // 3. Extract available leagues from the COMPLETE list (before any filters)
  const leagueMap = new Map<number, string>();
  for (const item of allItems) {
    if (item.league) leagueMap.set(item.league.id, item.league.name);
  }
  const availableLeagues = [...leagueMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 3b. Compute issue counts from the COMPLETE deduplicated list (before search filter)
  const issueCounts = { stuck: 0, overdue: 0, noScores: 0, unsettled: 0 };
  for (const item of allItems) {
    issueCounts[item.issueType]++;
  }

  // 4. Filter to requested category
  let filtered =
    issueType === "all"
      ? allItems
      : allItems.filter((item) => item.issueType === issueType);

  // 4b. Apply text search filter (fixture name, team names, externalId)
  if (searchLower) {
    filtered = filtered.filter((item) => {
      const name = item.name.toLowerCase();
      const home = item.homeTeam?.name.toLowerCase() ?? "";
      const away = item.awayTeam?.name.toLowerCase() ?? "";
      const extId = item.externalId.toString();
      return (
        name.includes(searchLower) ||
        home.includes(searchLower) ||
        away.includes(searchLower) ||
        extId.includes(searchLower)
      );
    });
  }

  // 4c. Apply timeframe filter (based on issueSince)
  if (timeframe !== "all") {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const thresholds: Record<string, { min?: number; max?: number }> = {
      "1h": { max: 1 * HOUR },
      "3h": { max: 3 * HOUR },
      "6h": { max: 6 * HOUR },
      "12h": { max: 12 * HOUR },
      "24h": { max: 24 * HOUR },
      "24h+": { min: 24 * HOUR },
    };
    const range = thresholds[timeframe];
    if (range) {
      filtered = filtered.filter((item) => {
        const age = now - new Date(item.issueSince).getTime();
        if (range.min != null && age < range.min) return false;
        if (range.max != null && age > range.max) return false;
        return true;
      });
    }
  }

  // 4d. Apply league filter
  if (leagueId) {
    filtered = filtered.filter((item) => item.league?.id === leagueId);
  }

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

  // 6. Extract allExternalIds from the full filtered array (before pagination)
  const allExternalIds = filtered.map((item) => item.externalId.toString());

  // 7. Paginate
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const offset = (page - 1) * perPage;
  const pageSlice = filtered.slice(offset, offset + perPage);

  // 8. Hydrate ONLY the current page items with group/prediction counts
  const pageItems = await Promise.all(pageSlice.map(hydrateItem));

  return {
    status: "success",
    data: pageItems,
    issueCounts,
    pagination: { page, perPage, totalItems, totalPages },
    allExternalIds,
    availableLeagues,
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
  const nowTs = nowUnixSeconds();
  const stuckStartTs = nowTs - STUCK_THRESHOLD_SECONDS;
  const rows = await prisma.fixtures.findMany({
    where: {
      externalId: { gte: 0 },
      state: { in: LIVE_STATES_ARR },
      startTs: { lt: stuckStartTs },
    },
    select: FIXTURE_SELECT,
    orderBy: { startTs: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    issueType: "stuck" as const,
    issueLabel: "Stuck LIVE",
    issueSince: r.startIso,
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
    lastProviderState: row.lastProviderState,
    lastProviderCheckAt: row.lastProviderCheckAt?.toISOString() ?? null,
  };
}
