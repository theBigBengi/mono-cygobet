import { prisma, RunStatus } from "@repo/db";
import type { FixtureState } from "@repo/db";
import type { AdminDashboardResponse } from "@repo/types";
import { LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { nowUnixSeconds } from "../../utils/dates";

const LIVE_STATES_ARR = [...LIVE_STATES] as FixtureState[];
const FINISHED_STATES_ARR = [...FINISHED_STATES] as FixtureState[];

const STUCK_THRESHOLD_MS = 3 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function getDashboardData(): Promise<AdminDashboardResponse> {
  const now = new Date();
  const nowTs = nowUnixSeconds();
  const stuckCutoff = new Date(now.getTime() - STUCK_THRESHOLD_MS);

  const unsettledFixtureIds = await getUnsettledFixtureIds();

  // ── Jobs data ──
  const enabledJobs = await prisma.jobs.findMany({
    where: { enabled: true },
    select: { key: true, description: true },
  });

  const failingJobs: AdminDashboardResponse["jobs"]["failingJobs"] = [];
  let healthyCount = 0;

  for (const job of enabledJobs) {
    const lastRuns = await prisma.jobRuns.findMany({
      where: { jobKey: job.key },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { status: true, startedAt: true, errorMessage: true },
    });

    const lastRun = lastRuns[0];
    if (!lastRun || lastRun.status !== RunStatus.failed) {
      healthyCount++;
      continue;
    }

    // Count consecutive failures
    let consecutive = 0;
    for (const run of lastRuns) {
      if (run.status === RunStatus.failed) consecutive++;
      else break;
    }

    failingJobs.push({
      key: job.key,
      description: job.description,
      lastError: lastRun.errorMessage,
      lastRunAt: lastRun.startedAt.toISOString(),
      consecutiveFailures: consecutive,
    });
  }

  // ── Fixtures data ──
  const stuckWhere = {
    externalId: { gte: 0 } as const,
    state: { in: LIVE_STATES_ARR },
    updatedAt: { lt: stuckCutoff },
  };
  const overdueNsWhere = {
    externalId: { gte: 0 } as const,
    state: "NS" as const,
    startTs: { lt: nowTs },
  };
  const noScoresWhere = {
    externalId: { gte: 0 } as const,
    state: { in: FINISHED_STATES_ARR },
    OR: [{ homeScore90: null }, { awayScore90: null }],
  };

  const [
    liveCount,
    pendingSettlement,
    stuckRows,
    stuckCount,
    overdueNsRows,
    overdueNsCount,
    unsettledRows,
    noScoresRows,
    noScoresCount,
  ] = await Promise.all([
    prisma.fixtures.count({
      where: { externalId: { gte: 0 }, state: { in: LIVE_STATES_ARR } },
    }),
    unsettledFixtureIds.length === 0
      ? 0
      : prisma.fixtures.count({
          where: {
            id: { in: unsettledFixtureIds },
            externalId: { gte: 0 },
            state: { in: FINISHED_STATES_ARR },
          },
        }),
    prisma.fixtures.findMany({
      where: stuckWhere,
      orderBy: { updatedAt: "asc" },
      take: 20,
      select: { id: true, name: true, state: true, updatedAt: true },
    }),
    prisma.fixtures.count({ where: stuckWhere }),
    prisma.fixtures.findMany({
      where: overdueNsWhere,
      orderBy: { startTs: "asc" },
      take: 20,
      select: { id: true, name: true, startTs: true },
    }),
    prisma.fixtures.count({ where: overdueNsWhere }),
    unsettledFixtureIds.length === 0
      ? []
      : prisma.fixtures.findMany({
          where: {
            id: { in: unsettledFixtureIds },
            externalId: { gte: 0 },
            state: { in: FINISHED_STATES_ARR },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: { id: true, name: true, state: true },
        }),
    prisma.fixtures.findMany({
      where: noScoresWhere,
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, name: true, state: true },
    }),
    prisma.fixtures.count({ where: noScoresWhere }),
  ]);

  // Enrich unsettled with prediction count
  const unsettled: AdminDashboardResponse["fixtures"]["unsettled"] = [];
  for (const f of unsettledRows) {
    const predictionCount = await prisma.groupPredictions.count({
      where: { settledAt: null, groupFixtures: { fixtureId: f.id } },
    });
    unsettled.push({ id: f.id, name: f.name, predictionCount });
  }

  return {
    jobs: {
      totalEnabled: enabledJobs.length,
      healthyCount,
      failingJobs,
    },
    fixtures: {
      liveCount,
      pendingSettlement,
      stuck: stuckRows.map((f) => ({
        id: f.id,
        name: f.name,
        state: f.state,
        stuckSince: f.updatedAt.toISOString(),
      })),
      stuckCount,
      unsettled,
      overdueNs: overdueNsRows.map((f) => ({
        id: f.id,
        name: f.name,
        hoursOverdue: Math.round((nowTs - f.startTs) / 3600),
      })),
      overdueNsCount,
      noScores: noScoresRows.map((f) => ({
        id: f.id,
        name: f.name,
        state: f.state,
      })),
      noScoresCount,
    },
  };
}

async function getUnsettledFixtureIds(): Promise<number[]> {
  const gfIds = await prisma.groupPredictions
    .findMany({
      where: { settledAt: null },
      select: { groupFixtureId: true },
      distinct: ["groupFixtureId"],
    })
    .then((rows) => rows.map((r) => r.groupFixtureId));

  if (gfIds.length === 0) return [];

  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { id: { in: gfIds } },
    select: { fixtureId: true },
  });

  return [...new Set(groupFixtures.map((gf) => gf.fixtureId))];
}

/** Compute issue for a single fixture (Stuck LIVE, Overdue NS, Unsettled, or No Scores). */
export async function getFixtureIssue(fixture: {
  id: number;
  state: string;
  updatedAt: Date;
  startTs?: number | null;
  homeScore90?: number | null;
  awayScore90?: number | null;
}): Promise<string | null> {
  const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
  const nowTs = Math.floor(Date.now() / 1000);

  if (
    LIVE_STATES_ARR.includes(fixture.state as FixtureState) &&
    fixture.updatedAt < stuckCutoff
  ) {
    return "Stuck LIVE";
  }
  if (
    fixture.state === "NS" &&
    fixture.startTs != null &&
    fixture.startTs < nowTs
  ) {
    return "Overdue NS";
  }
  if (!FINISHED_STATES_ARR.includes(fixture.state as FixtureState)) {
    return null;
  }
  if (fixture.homeScore90 == null || fixture.awayScore90 == null) {
    return "No Scores";
  }
  const hasUnsettled =
    (await prisma.groupPredictions.count({
      where: {
        settledAt: null,
        groupFixtures: { fixtureId: fixture.id },
      },
    })) > 0;
  return hasUnsettled ? "Unsettled" : null;
}
