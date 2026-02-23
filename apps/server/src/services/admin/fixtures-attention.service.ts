/**
 * Fixtures Attention Service
 * --------------------------
 * Thin read layer over the fixture_issues table.
 * Detection is handled by fixture-issues-detector.service.ts (cron job).
 * This service just reads stored results, filters, paginates, and hydrates.
 */

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import type {
  FixtureIssueType,
  AdminFixtureAttentionItem,
  AdminFixturesAttentionResponse,
} from "@repo/types";

export type AttentionTimeframe = "1h" | "3h" | "6h" | "12h" | "24h" | "24h+" | "all";

export interface FixturesAttentionParams {
  issueType?: FixtureIssueType | "all";
  search?: string;
  timeframe?: AttentionTimeframe;
  fromTs?: number;
  toTs?: number;
  leagueId?: number;
  page?: number;
  perPage?: number;
}

const ISSUE_PRIORITY: Record<string, number> = {
  stuck: 0,
  unsettled: 1,
  overdue: 2,
  noScores: 3,
  scoreMismatch: 4,
};

const ISSUE_LABELS: Record<string, string> = {
  stuck: "Stuck LIVE",
  overdue: "Overdue NS",
  noScores: "No Scores",
  unsettled: "Unsettled",
  scoreMismatch: "Score Mismatch",
};

export async function getFixturesNeedingAttention(
  params: FixturesAttentionParams = {}
): Promise<AdminFixturesAttentionResponse> {
  const { issueType = "all", search, timeframe = "all", fromTs, toTs, leagueId, page = 1, perPage = 25 } = params;
  const searchLower = search?.trim().toLowerCase();

  // 1. Query all active issues with fixture data
  const issues = await prisma.fixtureIssues.findMany({
    where: { resolvedAt: null },
    select: {
      id: true,
      fixtureId: true,
      issueType: true,
      severity: true,
      metadata: true,
      detectedAt: true,
      fixture: {
        select: {
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
        },
      },
    },
    orderBy: { detectedAt: "asc" },
  });

  // 2. Deduplicate by fixtureId (priority: stuck > unsettled > overdue > noScores > scoreMismatch)
  const seen = new Map<number, typeof issues[0]>();
  const sortedIssues = [...issues].sort(
    (a, b) =>
      (ISSUE_PRIORITY[a.issueType] ?? 99) - (ISSUE_PRIORITY[b.issueType] ?? 99)
  );
  for (const issue of sortedIssues) {
    if (!seen.has(issue.fixtureId)) {
      seen.set(issue.fixtureId, issue);
    }
  }
  let allItems = Array.from(seen.values());

  // 3. Compute issue counts from full set and extract available leagues (before filters)
  const issueCounts = { stuck: 0, overdue: 0, noScores: 0, unsettled: 0, scoreMismatch: 0 };
  // Count from all issues (not deduplicated) would overcount — count from deduplicated
  for (const item of allItems) {
    const type = item.issueType as FixtureIssueType;
    if (type in issueCounts) issueCounts[type]++;
  }

  const leagueMap = new Map<number, string>();
  for (const item of allItems) {
    const league = item.fixture.league;
    if (league) leagueMap.set(league.id, league.name);
  }
  const availableLeagues = [...leagueMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 4. Apply filters
  if (issueType !== "all") {
    allItems = allItems.filter((item) => item.issueType === issueType);
  }

  if (searchLower) {
    allItems = allItems.filter((item) => {
      const f = item.fixture;
      return (
        f.name.toLowerCase().includes(searchLower) ||
        (f.homeTeam?.name.toLowerCase().includes(searchLower) ?? false) ||
        (f.awayTeam?.name.toLowerCase().includes(searchLower) ?? false) ||
        f.externalId.toString().includes(searchLower)
      );
    });
  }

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
      allItems = allItems.filter((item) => {
        const age = now - item.detectedAt.getTime();
        if (range.min != null && age < range.min) return false;
        if (range.max != null && age > range.max) return false;
        return true;
      });
    }
  }

  if (fromTs != null || toTs != null) {
    allItems = allItems.filter((item) => {
      const ts = Math.floor(item.detectedAt.getTime() / 1000);
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      return true;
    });
  }

  if (leagueId) {
    allItems = allItems.filter((item) => item.fixture.league?.id === leagueId);
  }

  // 5. Sort: priority then oldest first
  allItems.sort((a, b) => {
    const pDiff =
      (ISSUE_PRIORITY[a.issueType] ?? 99) -
      (ISSUE_PRIORITY[b.issueType] ?? 99);
    if (pDiff !== 0) return pDiff;
    return a.detectedAt.getTime() - b.detectedAt.getTime();
  });

  // 6. Extract allExternalIds before pagination
  const allExternalIds = allItems.map((item) =>
    item.fixture.externalId.toString()
  );

  // 7. Paginate
  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const offset = (page - 1) * perPage;
  const pageSlice = allItems.slice(offset, offset + perPage);

  // 8. Hydrate page items with group/prediction counts
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

// ── Hydrate a single issue item with group/prediction counts ──

async function hydrateItem(
  issue: {
    issueType: string;
    severity: string;
    metadata: unknown;
    detectedAt: Date;
    fixture: {
      id: number;
      name: string;
      externalId: string;
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
  }
): Promise<AdminFixtureAttentionItem> {
  const f = issue.fixture;
  const meta = (typeof issue.metadata === "object" && issue.metadata && !Array.isArray(issue.metadata)
    ? issue.metadata
    : {}) as Record<string, unknown>;

  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId: f.id },
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

  const result: AdminFixtureAttentionItem = {
    id: f.id,
    name: f.name,
    externalId: f.externalId.toString(),
    startIso: f.startIso,
    startTs: f.startTs,
    state: f.state,
    result: f.result,
    homeScore90: f.homeScore90,
    awayScore90: f.awayScore90,
    issueType: issue.issueType as FixtureIssueType,
    issueLabel: ISSUE_LABELS[issue.issueType] ?? issue.issueType,
    issueSince: issue.detectedAt.toISOString(),
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    league: f.league,
    groupCount,
    predictionCount,
    lastProviderState: f.lastProviderState,
    lastProviderCheckAt: f.lastProviderCheckAt?.toISOString() ?? null,
  };

  // Add provider scores for scoreMismatch issues
  if (issue.issueType === "scoreMismatch") {
    result.providerHomeScore90 = (meta.providerHomeScore90 as number) ?? null;
    result.providerAwayScore90 = (meta.providerAwayScore90 as number) ?? null;
    result.providerHomeScoreET = (meta.providerHomeScoreET as number) ?? null;
    result.providerAwayScoreET = (meta.providerAwayScoreET as number) ?? null;
  }

  return result;
}
