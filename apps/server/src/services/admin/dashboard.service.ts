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
  const failedJobsCutoff = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);

  const unsettledFixtureIds = await getUnsettledFixtureIds();

  const [
    liveCount,
    pendingSettlement,
    failedJobs24h,
    stuckFixtures,
    overdueNsCount,
    overdueNsRows,
    recentFailedJobsRows,
    stuckFixtureRows,
    finishedUnsettledRows,
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
    prisma.jobRuns.count({
      where: {
        status: RunStatus.failed,
        startedAt: { gte: failedJobsCutoff },
      },
    }),
    prisma.fixtures.count({
      where: {
        externalId: { gte: 0 },
        state: { in: LIVE_STATES_ARR },
        updatedAt: { lt: stuckCutoff },
      },
    }),
    prisma.fixtures.count({
      where: { externalId: { gte: 0 }, state: "NS", startTs: { lt: nowTs } },
    }),
    prisma.fixtures.findMany({
      where: { externalId: { gte: 0 }, state: "NS", startTs: { lt: nowTs } },
      orderBy: { startTs: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        state: true,
        startIso: true,
        startTs: true,
        league: { select: { name: true } },
      },
    }),
    prisma.jobRuns.findMany({
      where: {
        status: RunStatus.failed,
        startedAt: { gte: failedJobsCutoff },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true,
        jobKey: true,
        errorMessage: true,
        startedAt: true,
      },
    }),
    prisma.fixtures.findMany({
      where: {
        externalId: { gte: 0 },
        state: { in: LIVE_STATES_ARR },
        updatedAt: { lt: stuckCutoff },
      },
      select: { id: true, name: true, state: true, updatedAt: true },
    }),
    unsettledFixtureIds.length === 0
      ? []
      : prisma.fixtures.findMany({
          where: {
            id: { in: unsettledFixtureIds },
            externalId: { gte: 0 },
            state: { in: FINISHED_STATES_ARR },
          },
          select: {
            id: true,
            name: true,
            state: true,
            updatedAt: true,
            result: true,
            homeScore90: true,
            awayScore90: true,
          },
        }),
  ]);

  const attentionMap = new Map<
    number,
    {
      id: number;
      name: string;
      state: string;
      updatedAt: string;
      issue: string;
    }
  >();

  for (const f of stuckFixtureRows) {
    attentionMap.set(f.id, {
      id: f.id,
      name: f.name,
      state: f.state,
      updatedAt: f.updatedAt.toISOString(),
      issue: "Stuck LIVE",
    });
  }

  for (const f of finishedUnsettledRows) {
    if (attentionMap.has(f.id)) continue;
    attentionMap.set(f.id, {
      id: f.id,
      name: f.name,
      state: f.state,
      updatedAt: f.updatedAt.toISOString(),
      issue: "Unsettled",
    });
  }

  for (const f of overdueNsRows) {
    if (attentionMap.has(f.id)) continue;
    attentionMap.set(f.id, {
      id: f.id,
      name: f.name,
      state: f.state,
      updatedAt: f.startIso,
      issue: "Overdue NS",
    });
  }

  const recentFailedJobs: AdminDashboardResponse["recentFailedJobs"] =
    recentFailedJobsRows.map((r) => ({
      id: r.id,
      jobKey: r.jobKey,
      errorMessage: r.errorMessage,
      startedAt: r.startedAt.toISOString(),
    }));

  const fixturesNeedingAttention = Array.from(attentionMap.values());

  return {
    liveCount,
    pendingSettlement,
    failedJobs24h,
    stuckFixtures,
    overdueNsCount,
    recentFailedJobs,
    fixturesNeedingAttention,
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

/** Compute issue for a single fixture (Stuck LIVE, Overdue NS, or Unsettled). */
export async function getFixtureIssue(fixture: {
  id: number;
  state: string;
  updatedAt: Date;
  startTs?: number | null;
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
  const hasUnsettled =
    (await prisma.groupPredictions.count({
      where: {
        settledAt: null,
        groupFixtures: { fixtureId: fixture.id },
      },
    })) > 0;
  return hasUnsettled ? "Unsettled" : null;
}
