/**
 * Fixture Issues Detector Service
 * --------------------------------
 * Modular detection engine. Each detector is a pure function that returns
 * issues to upsert. A background cron job calls runFullDetection() every
 * few minutes. Screens and alerts just read the stored results.
 *
 * Issue types:
 * - stuck: LIVE fixtures not updated for 3+ hours
 * - overdue: NS fixtures past their start time
 * - noScores: Finished fixtures missing score data
 * - unsettled: Finished fixtures with unsettled predictions
 * - scoreMismatch: DB scores differ from provider scores
 */

import { prisma, Prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { nowUnixSeconds } from "../../utils/dates";
import { adapter } from "../../utils/adapter";
import { getLogger } from "../../logger";

const log = getLogger("FixtureIssuesDetector");

const LIVE_STATES_ARR = [...LIVE_STATES] as FixtureState[];
const FINISHED_STATES_ARR = [...FINISHED_STATES] as FixtureState[];

const STUCK_THRESHOLD_SECONDS = 3 * 60 * 60; // 3 hours
const STUCK_CRITICAL_SECONDS = 6 * 60 * 60; // 6 hours
const OVERDUE_CRITICAL_SECONDS = 4 * 60 * 60; // 4 hours
const SCORE_MISMATCH_GRACE_MS = 30 * 60 * 1000; // 30 min grace after finishing
const SCORE_MISMATCH_LOOKBACK_HOURS = 72; // check recently finished fixtures

type DetectedIssue = {
  fixtureId: number;
  issueType: string;
  severity: "critical" | "warning" | "info";
  metadata: Record<string, unknown>;
};

// ─── Public API ───

/**
 * Run all detectors in parallel, upsert results, and auto-resolve
 * any active issues that are no longer detected.
 */
export type DetectionResult = {
  upserted: number;
  resolved: number;
  upsertedIssues: DetectedIssue[];
  resolvedIssues: { fixtureId: number; issueType: string }[];
};

export async function runFullDetection(): Promise<DetectionResult> {
  const [stuck, overdue, noScores, unsettled, scoreMismatch] =
    await Promise.all([
      detectStuck(),
      detectOverdue(),
      detectNoScores(),
      detectUnsettled(),
      detectScoreMismatch(),
    ]);

  const allIssues = [
    ...stuck,
    ...overdue,
    ...noScores,
    ...unsettled,
    ...scoreMismatch,
  ];

  // Upsert all detected issues
  let upserted = 0;
  for (const issue of allIssues) {
    await prisma.fixtureIssues.upsert({
      where: {
        fixtureId_issueType: {
          fixtureId: issue.fixtureId,
          issueType: issue.issueType,
        },
      },
      create: {
        fixtureId: issue.fixtureId,
        issueType: issue.issueType,
        severity: issue.severity,
        metadata: issue.metadata as Prisma.InputJsonObject,
      },
      update: {
        severity: issue.severity,
        metadata: issue.metadata as Prisma.InputJsonObject,
        resolvedAt: null, // re-open if previously resolved
      },
    });
    upserted++;
  }

  // Auto-resolve: any active issue NOT in the detected set
  const detectedKeys = new Set(
    allIssues.map((i) => `${i.fixtureId}:${i.issueType}`)
  );

  const activeIssues = await prisma.fixtureIssues.findMany({
    where: { resolvedAt: null },
    select: { id: true, fixtureId: true, issueType: true },
  });

  let resolved = 0;
  const resolvedIssues: { fixtureId: number; issueType: string }[] = [];
  for (const active of activeIssues) {
    if (!detectedKeys.has(`${active.fixtureId}:${active.issueType}`)) {
      await prisma.fixtureIssues.update({
        where: { id: active.id },
        data: { resolvedAt: new Date() },
      });
      resolved++;
      resolvedIssues.push({
        fixtureId: active.fixtureId,
        issueType: active.issueType,
      });
    }
  }

  log.info({ upserted, resolved }, "Detection cycle complete");
  return { upserted, resolved, upsertedIssues: allIssues, resolvedIssues };
}

/**
 * Immediately resolve issues for a specific fixture.
 * Called after admin actions (sync, resettle) so issues don't linger
 * until the next cron run.
 */
export async function resolveIssuesForFixture(
  fixtureId: number,
  issueTypes?: string[]
): Promise<number> {
  const where: Prisma.fixtureIssuesWhereInput = {
    fixtureId,
    resolvedAt: null,
  };
  if (issueTypes?.length) {
    where.issueType = { in: issueTypes };
  }

  const result = await prisma.fixtureIssues.updateMany({
    where,
    data: { resolvedAt: new Date() },
  });
  return result.count;
}

// ─── Detectors ───

async function detectStuck(): Promise<DetectedIssue[]> {
  const nowTs = nowUnixSeconds();
  const stuckStartTs = nowTs - STUCK_THRESHOLD_SECONDS;

  const rows = await prisma.fixtures.findMany({
    where: {
      isSandbox: false,
      state: { in: LIVE_STATES_ARR },
      startTs: { lt: stuckStartTs },
    },
    select: {
      id: true,
      name: true,
      state: true,
      startTs: true,
      lastProviderState: true,
    },
  });

  return rows.map((f) => {
    const hoursStuck = Math.round((nowTs - f.startTs) / 3600);
    const severity: "critical" | "warning" =
      nowTs - f.startTs >= STUCK_CRITICAL_SECONDS ? "critical" : "warning";
    return {
      fixtureId: f.id,
      issueType: "stuck",
      severity,
      metadata: {
        fixtureName: f.name,
        state: f.state,
        hoursStuck,
        lastProviderState: f.lastProviderState,
      },
    };
  });
}

async function detectOverdue(): Promise<DetectedIssue[]> {
  const nowTs = nowUnixSeconds();

  const rows = await prisma.fixtures.findMany({
    where: {
      isSandbox: false,
      state: "NS",
      startTs: { lt: nowTs },
    },
    select: {
      id: true,
      name: true,
      startTs: true,
      lastProviderState: true,
      lastProviderCheckAt: true,
    },
  });

  return rows.map((f) => {
    const overdueSeconds = nowTs - f.startTs;
    const hoursOverdue = Math.round(overdueSeconds / 3600);
    const severity: "critical" | "warning" =
      overdueSeconds >= OVERDUE_CRITICAL_SECONDS ? "critical" : "warning";
    return {
      fixtureId: f.id,
      issueType: "overdue",
      severity,
      metadata: {
        fixtureName: f.name,
        hoursOverdue,
        lastProviderState: f.lastProviderState,
        lastProviderCheckAt: f.lastProviderCheckAt?.toISOString() ?? null,
      },
    };
  });
}

async function detectNoScores(): Promise<DetectedIssue[]> {
  const rows = await prisma.fixtures.findMany({
    where: {
      isSandbox: false,
      state: { in: FINISHED_STATES_ARR },
      OR: [{ homeScore90: null }, { awayScore90: null }],
    },
    select: { id: true, name: true, state: true },
  });

  return rows.map((f) => ({
    fixtureId: f.id,
    issueType: "noScores",
    severity: "warning" as const,
    metadata: { fixtureName: f.name, state: f.state },
  }));
}

async function detectUnsettled(): Promise<DetectedIssue[]> {
  const gfRows = await prisma.groupPredictions.findMany({
    where: { settledAt: null },
    select: { groupFixtureId: true },
    distinct: ["groupFixtureId"],
  });
  if (gfRows.length === 0) return [];

  const gfIds = gfRows.map((r) => r.groupFixtureId);
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { id: { in: gfIds } },
    select: { id: true, fixtureId: true },
  });
  const fixtureIds = [...new Set(groupFixtures.map((gf) => gf.fixtureId))];
  if (fixtureIds.length === 0) return [];

  const finishedFixtures = await prisma.fixtures.findMany({
    where: {
      id: { in: fixtureIds },
      isSandbox: false,
      state: { in: FINISHED_STATES_ARR },
    },
    select: { id: true, name: true, state: true },
  });

  if (finishedFixtures.length === 0) return [];

  // Count unsettled predictions per fixture
  const finishedFixtureIds = finishedFixtures.map((f) => f.id);
  const gfMapping = await prisma.groupFixtures.findMany({
    where: { fixtureId: { in: finishedFixtureIds } },
    select: { id: true, fixtureId: true },
  });

  const gfIdToFixtureId = new Map<number, number>();
  for (const gf of gfMapping) gfIdToFixtureId.set(gf.id, gf.fixtureId);

  const allGfIds = gfMapping.map((gf) => gf.id);
  const countsPerGf =
    allGfIds.length > 0
      ? await prisma.groupPredictions.groupBy({
          by: ["groupFixtureId"],
          where: { groupFixtureId: { in: allGfIds }, settledAt: null },
          _count: true,
        })
      : [];

  const countsByFixture = new Map<number, number>();
  for (const row of countsPerGf) {
    const fixtureId = gfIdToFixtureId.get(row.groupFixtureId);
    if (fixtureId != null) {
      countsByFixture.set(
        fixtureId,
        (countsByFixture.get(fixtureId) ?? 0) + row._count
      );
    }
  }

  return finishedFixtures
    .filter((f) => (countsByFixture.get(f.id) ?? 0) > 0)
    .map((f) => ({
      fixtureId: f.id,
      issueType: "unsettled",
      severity: "warning" as const,
      metadata: {
        fixtureName: f.name,
        state: f.state,
        predictionCount: countsByFixture.get(f.id) ?? 0,
      },
    }));
}

async function detectScoreMismatch(): Promise<DetectedIssue[]> {
  const now = Date.now();
  const lookbackMs = SCORE_MISMATCH_LOOKBACK_HOURS * 60 * 60 * 1000;
  const lookbackTs = Math.floor((now - lookbackMs) / 1000);

  // Find recently finished fixtures that have groups and have scores
  const candidates = await prisma.fixtures.findMany({
    where: {
      isSandbox: false,
      state: { in: FINISHED_STATES_ARR },
      startTs: { gte: lookbackTs },
      homeScore90: { not: null },
      awayScore90: { not: null },
      groupFixtures: { some: {} }, // only fixtures in groups
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      state: true,
      homeScore90: true,
      awayScore90: true,
      homeScoreET: true,
      awayScoreET: true,
      updatedAt: true,
    },
  });

  if (candidates.length === 0) return [];

  // Fetch provider data in chunks
  const CHUNK_SIZE = 50;
  const externalIds = candidates.map((f) => f.externalId);
  const providerMap = new Map<
    string,
    {
      homeScore90?: number | null;
      awayScore90?: number | null;
      homeScoreET?: number | null;
      awayScoreET?: number | null;
      homeScore?: number | null;
      awayScore?: number | null;
    }
  >();

  for (let i = 0; i < externalIds.length; i += CHUNK_SIZE) {
    const chunk = externalIds.slice(i, i + CHUNK_SIZE);
    try {
      const providerFixtures = await adapter.fetchFixturesByIds(chunk);
      for (const pf of providerFixtures) {
        providerMap.set(String(pf.externalId), {
          homeScore90: pf.homeScore90,
          awayScore90: pf.awayScore90,
          homeScoreET: pf.homeScoreET,
          awayScoreET: pf.awayScoreET,
          homeScore: pf.homeScore,
          awayScore: pf.awayScore,
        });
      }
    } catch (err) {
      log.warn(
        { err, chunkStart: i, chunkSize: chunk.length },
        "Failed to fetch provider fixtures for score mismatch detection"
      );
    }
  }

  const issues: DetectedIssue[] = [];

  for (const f of candidates) {
    const prov = providerMap.get(f.externalId);
    if (!prov) continue;

    // Grace period: skip fixtures finished very recently
    const finishedAgoMs = now - f.updatedAt.getTime();
    if (finishedAgoMs < SCORE_MISMATCH_GRACE_MS) continue;

    // Resolve provider 90min score: prefer homeScore90, fall back to homeScore
    const provHome90 = prov.homeScore90 ?? prov.homeScore ?? null;
    const provAway90 = prov.awayScore90 ?? prov.awayScore ?? null;
    const provHomeET = prov.homeScoreET ?? null;
    const provAwayET = prov.awayScoreET ?? null;

    // Compare scores
    const has90Mismatch =
      provHome90 != null &&
      provAway90 != null &&
      (f.homeScore90 !== provHome90 || f.awayScore90 !== provAway90);

    const hasETMismatch =
      provHomeET != null &&
      provAwayET != null &&
      (f.homeScoreET !== provHomeET || f.awayScoreET !== provAwayET);

    if (!has90Mismatch && !hasETMismatch) continue;

    issues.push({
      fixtureId: f.id,
      issueType: "scoreMismatch",
      severity: "warning",
      metadata: {
        fixtureName: f.name,
        dbHomeScore90: f.homeScore90,
        dbAwayScore90: f.awayScore90,
        dbHomeScoreET: f.homeScoreET,
        dbAwayScoreET: f.awayScoreET,
        providerHomeScore90: provHome90,
        providerAwayScore90: provAway90,
        providerHomeScoreET: provHomeET,
        providerAwayScoreET: provAwayET,
        has90Mismatch,
        hasETMismatch,
      },
    });
  }

  return issues;
}
