import type { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import { JobRunOpts } from "../types/jobs";
import { PREDICTION_REMINDERS_JOB } from "./jobs.definitions";
import { getJobRowOrThrow } from "./jobs.db";
import { getMeta, clampInt } from "./jobs.meta";
import { runJob } from "./run-job";

const DEFAULT_REMINDER_WINDOW_HOURS = 2;
const EVENT_TYPE = "prediction_reminder" as const;

/**
 * prediction-reminders job
 * ------------------------
 * Goal: create user-specific reminder events for upcoming fixtures the user hasn't predicted.
 *
 * Logic:
 * 1. Find all active groups.
 * 2. For each group, find groupFixtures whose fixture is NS and starts within reminderWindowHours.
 * 3. For each such fixture, find group members who have no prediction for that fixture.
 * 4. For each (user, fixture, group), dedup by existing userActivityEvents; if none, create one.
 */
export const predictionRemindersJob = PREDICTION_REMINDERS_JOB;

type PredictionRemindersResult = {
  jobRunId: number;
  remindersCreated: number;
  groupsProcessed: number;
  skipped: boolean;
};

export async function runPredictionRemindersJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<PredictionRemindersResult> {
  const jobRow = await getJobRowOrThrow(predictionRemindersJob.key);
  const meta = getMeta<{ reminderWindowHours?: number }>(jobRow.meta as Record<string, unknown>);
  const reminderWindowHours = clampInt(
    meta.reminderWindowHours ?? DEFAULT_REMINDER_WINDOW_HOURS,
    1,
    24
  );

  return runJob<PredictionRemindersResult>({
    jobKey: predictionRemindersJob.key,
    loggerName: "PredictionRemindersJob",
    opts,
    jobRow,
    meta: { reminderWindowHours },
    skippedResult: (jobRunId) => ({
      jobRunId,
      remindersCreated: 0,
      groupsProcessed: 0,
      skipped: true,
    }),
    run: async ({ jobRunId }) => {
      if (opts.dryRun) {
        return {
          result: {
            jobRunId,
            remindersCreated: 0,
            groupsProcessed: 0,
            skipped: false,
          },
          rowsAffected: 0,
          meta: { dryRun: true, reminderWindowHours },
        };
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const windowEndSec = nowSec + reminderWindowHours * 3600;

      const activeGroups = await prisma.groups.findMany({
        where: { status: "active" },
        select: {
          id: true,
          name: true,
          groupFixtures: {
            select: {
              id: true,
              groupId: true,
              fixtureId: true,
              fixtures: {
                select: {
                  id: true,
                  startTs: true,
                  state: true,
                  startIso: true,
                  homeTeamId: true,
                  awayTeamId: true,
                  homeTeam: { select: { name: true } },
                  awayTeam: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      let remindersCreated = 0;

      for (const group of activeGroups) {
        for (const gf of group.groupFixtures) {
          const fixture = gf.fixtures;
          if (!fixture || fixture.state !== "NS") continue;
          if (fixture.startTs < nowSec || fixture.startTs > windowEndSec) continue;

          const homeTeamName = fixture.homeTeam?.name ?? "Home";
          const awayTeamName = fixture.awayTeam?.name ?? "Away";
          const body = `${homeTeamName} vs ${awayTeamName} starts soon — predict now!`;

          const membersWithPredictions = await prisma.groupPredictions.findMany({
            where: {
              groupId: group.id,
              groupFixtureId: gf.id,
            },
            select: { userId: true },
          });
          const predictedUserIds = new Set(membersWithPredictions.map((p) => p.userId));

          const membersWithoutPrediction = await prisma.groupMembers.findMany({
            where: {
              groupId: group.id,
              status: "joined",
              userId: { notIn: [...predictedUserIds] },
            },
            select: { userId: true },
          });

          for (const member of membersWithoutPrediction) {
            const existing = await prisma.userActivityEvents.findFirst({
              where: {
                userId: member.userId,
                eventType: EVENT_TYPE,
                groupId: group.id,
                meta: { path: ["fixtureId"], equals: fixture.id },
              },
            });
            if (existing) continue;

            await prisma.userActivityEvents.create({
              data: {
                userId: member.userId,
                groupId: group.id,
                eventType: EVENT_TYPE,
                body,
                meta: {
                  fixtureId: fixture.id,
                  groupId: group.id,
                  groupName: group.name,
                  homeTeam: homeTeamName,
                  awayTeam: awayTeamName,
                  kickoffAt: fixture.startIso,
                },
              },
            });
            remindersCreated++;
          }
        }
      }

      return {
        result: {
          jobRunId,
          remindersCreated,
          groupsProcessed: activeGroups.length,
          skipped: false,
        },
        rowsAffected: remindersCreated,
        meta: {
          reminderWindowHours,
          remindersCreated,
          groupsProcessed: activeGroups.length,
        },
      };
    },
  });
}
