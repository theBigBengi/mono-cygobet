import { prisma, RunStatus } from "@repo/db";
import type { FixtureState } from "@repo/db";
import type { AdminDashboardResponse } from "@repo/types";
import { LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { parseScores } from "../../etl/transform/fixtures.transform";

const LIVE_STATES_ARR = [...LIVE_STATES] as FixtureState[];
const FINISHED_STATES_ARR = [...FINISHED_STATES] as FixtureState[];

const STUCK_THRESHOLD_MS = 3 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function getDashboardData(): Promise<AdminDashboardResponse> {
  const now = new Date();
  const stuckCutoff = new Date(now.getTime() - STUCK_THRESHOLD_MS);
  const failedJobsCutoff = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);

  const unsettledFixtureIds = await getUnsettledFixtureIds();

  const [
    liveCount,
    pendingSettlement,
    failedJobs24h,
    stuckFixtures,
    recentFailedJobsRows,
    stuckFixtureRows,
    finishedUnsettledRows,
    finishedAllRows,
  ] = await Promise.all([
    prisma.fixtures.count({
      where: { state: { in: LIVE_STATES_ARR } },
    }),
    unsettledFixtureIds.length === 0
      ? 0
      : prisma.fixtures.count({
          where: {
            state: { in: FINISHED_STATES_ARR },
            id: { in: unsettledFixtureIds },
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
        state: { in: LIVE_STATES_ARR },
        updatedAt: { lt: stuckCutoff },
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
        state: { in: LIVE_STATES_ARR },
        updatedAt: { lt: stuckCutoff },
      },
      select: { id: true, name: true, state: true, updatedAt: true },
    }),
    unsettledFixtureIds.length === 0
      ? []
      : prisma.fixtures.findMany({
          where: {
            state: { in: FINISHED_STATES_ARR },
            id: { in: unsettledFixtureIds },
          },
          select: {
            id: true,
            name: true,
            state: true,
            updatedAt: true,
            result: true,
            homeScore: true,
            awayScore: true,
          },
        }),
    prisma.fixtures.findMany({
      where: { state: { in: FINISHED_STATES_ARR } },
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: {
        id: true,
        name: true,
        state: true,
        updatedAt: true,
        result: true,
        homeScore: true,
        awayScore: true,
      },
    }),
  ]);

  const unsettledSet = new Set(unsettledFixtureIds);
  const finishedWithScoreMismatch = finishedAllRows.filter((f) => {
    const parsed = parseScores(f.result);
    if (parsed.homeScore == null || parsed.awayScore == null) return false;
    return (
      f.homeScore !== parsed.homeScore || f.awayScore !== parsed.awayScore
    );
  });
  const scoreMismatchIds = new Set(
    finishedWithScoreMismatch.map((f) => f.id)
  );

  const attentionMap = new Map<
    number,
    { id: number; name: string; state: string; updatedAt: string; issue: string }
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
      issue: scoreMismatchIds.has(f.id) ? "Score mismatch" : "Unsettled",
    });
  }

  for (const f of finishedWithScoreMismatch) {
    if (attentionMap.has(f.id)) continue;
    attentionMap.set(f.id, {
      id: f.id,
      name: f.name,
      state: f.state,
      updatedAt: f.updatedAt.toISOString(),
      issue: "Score mismatch",
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
