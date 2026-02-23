/**
 * detect-fixture-issues job
 * -------------------------
 * Runs every 3 minutes to detect fixture issues (stuck, overdue, noScores,
 * unsettled, scoreMismatch) and persist them in the fixture_issues table.
 * Screens and alerts read from this table instead of running heavy queries.
 */

import type { FastifyInstance } from "fastify";
import { RunStatus } from "@repo/db";
import { JobRunOpts } from "../../types/jobs";
import { DETECT_FIXTURE_ISSUES_JOB } from "../jobs.definitions";
import { createBatchForJob, getJobRowOrThrow } from "../jobs.db";
import { runJob } from "../run-job";
import { trackSeedItem, finishSeedBatch } from "../../etl/seeds/seed.utils";

export const detectFixtureIssuesJob = DETECT_FIXTURE_ISSUES_JOB;

export async function runDetectFixtureIssuesJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
) {
  const jobRow = await getJobRowOrThrow(detectFixtureIssuesJob.key);

  return runJob({
    jobKey: detectFixtureIssuesJob.key,
    loggerName: "DetectFixtureIssuesJob",
    opts,
    jobRow,
    meta: {},
    skippedResult: () => ({
      upserted: 0,
      resolved: 0,
      skipped: true,
    }),
    run: async ({ jobRunId, log }) => {
      log.info("Running fixture issues detection");

      const { runFullDetection } = await import(
        "../../services/admin/fixture-issues-detector.service"
      );

      const { upserted, resolved, upsertedIssues, resolvedIssues } =
        await runFullDetection();

      log.info({ upserted, resolved }, "Fixture issues detection completed");

      // Create a batch so the admin UI can display per-item details
      let batchId: number | null = null;
      try {
        const batch = await createBatchForJob(
          detectFixtureIssuesJob.key,
          jobRunId
        );
        batchId = batch.id;

        for (const issue of upsertedIssues) {
          const fixtureName =
            (issue.metadata.fixtureName as string) ?? null;
          await trackSeedItem(
            batchId,
            String(issue.fixtureId),
            RunStatus.success,
            null,
            {
              entityType: "fixture-issue",
              name: fixtureName
                ? `#${issue.fixtureId} ${fixtureName}`
                : `#${issue.fixtureId}`,
              action: "detected",
              reason: issue.issueType,
              issueType: issue.issueType,
              severity: issue.severity,
            }
          );
        }

        for (const ri of resolvedIssues) {
          await trackSeedItem(
            batchId,
            String(ri.fixtureId),
            RunStatus.success,
            null,
            {
              entityType: "fixture-issue",
              name: `#${ri.fixtureId}`,
              action: "resolved",
              reason: ri.issueType,
              issueType: ri.issueType,
            }
          );
        }

        const total = upsertedIssues.length + resolvedIssues.length;
        await finishSeedBatch(batchId, RunStatus.success, {
          itemsTotal: total,
          itemsSuccess: total,
          itemsFailed: 0,
        });
      } catch (err) {
        log.warn({ err, batchId }, "Failed to track batch items (non-fatal)");
        if (batchId != null) {
          await finishSeedBatch(batchId, RunStatus.failed, {
            errorMessage: err instanceof Error ? err.message : String(err),
          }).catch(() => {});
        }
      }

      return {
        result: { upserted, resolved, skipped: false },
        rowsAffected: upserted + resolved,
        meta: {
          upserted,
          resolved,
          dryRun: !!opts.dryRun,
          ...(batchId != null && { batchId }),
        },
      };
    },
  });
}
