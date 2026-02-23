/**
 * Admin Alerts Service
 * --------------------
 * Generates, auto-resolves, and manages admin alerts.
 *
 * Fixture-related alerts now read from the fixture_issues table
 * (populated by fixture-issues-detector.service.ts).
 *
 * Alert categories:
 * - job_failure: Jobs failing consecutively (critical if 3+, warning if 1-2)
 * - fixture_stuck: From fixture_issues (critical >6h, warning 3-6h)
 * - fixture_unsettled: From fixture_issues (warning)
 * - data_quality: From fixture_issues — noScores (warning)
 * - overdue_ns: From fixture_issues (warning/critical)
 * - score_mismatch: From fixture_issues (warning)
 */

import { prisma, Prisma, RunStatus } from "@repo/db";
import type { AdminAlertItem, AdminAlertSeverity, AdminAlertCategory } from "@repo/types";
import { getLogger } from "../../logger";

const log = getLogger("AlertsService");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type AlertInput = {
  severity: AdminAlertSeverity;
  category: AdminAlertCategory;
  title: string;
  description: string;
  fingerprint: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Generate all alerts by scanning system state.
 * Upserts by fingerprint — existing unresolved alerts are updated, new ones created.
 * Returns list of newly created alerts (for Slack/Socket notifications).
 */
export async function generateAlerts(): Promise<AdminAlertItem[]> {
  const [jobFailureAlerts, fixtureIssueAlerts] = await Promise.all([
    detectJobFailures(),
    detectFixtureIssueAlerts(),
  ]);

  const alerts: AlertInput[] = [...jobFailureAlerts, ...fixtureIssueAlerts];
  const newAlerts: AdminAlertItem[] = [];

  for (const alert of alerts) {
    const existing = await prisma.adminAlerts.findUnique({
      where: { fingerprint: alert.fingerprint },
    });

    if (existing && !existing.resolvedAt) {
      // Update existing unresolved alert (description/severity may change)
      await prisma.adminAlerts.update({
        where: { id: existing.id },
        data: {
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          actionUrl: alert.actionUrl ?? null,
          actionLabel: alert.actionLabel ?? null,
          metadata: (alert.metadata ?? {}) as Prisma.InputJsonObject,
        },
      });
    } else if (!existing || existing.resolvedAt) {
      // Create new alert (or re-create if previously resolved)
      const row = existing?.resolvedAt
        ? await prisma.adminAlerts.update({
            where: { id: existing.id },
            data: {
              severity: alert.severity,
              category: alert.category,
              title: alert.title,
              description: alert.description,
              actionUrl: alert.actionUrl ?? null,
              actionLabel: alert.actionLabel ?? null,
              metadata: (alert.metadata ?? {}) as Prisma.InputJsonObject,
              resolvedAt: null,
              slackSentAt: null,
              createdAt: new Date(),
            },
          })
        : await prisma.adminAlerts.create({
            data: {
              severity: alert.severity,
              category: alert.category,
              title: alert.title,
              description: alert.description,
              actionUrl: alert.actionUrl ?? null,
              actionLabel: alert.actionLabel ?? null,
              metadata: (alert.metadata ?? {}) as Prisma.InputJsonObject,
              fingerprint: alert.fingerprint,
            },
          });

      newAlerts.push(formatAlert(row));
    }
  }

  return newAlerts;
}

/**
 * Auto-resolve alerts whose conditions no longer hold.
 * Checks each active alert's fingerprint against current system state.
 */
export async function autoResolveAlerts(): Promise<number> {
  const activeAlerts = await prisma.adminAlerts.findMany({
    where: { resolvedAt: null },
  });

  const currentFingerprints = new Set<string>();

  // Rebuild fingerprints from current system state
  const [jobFailureAlerts, fixtureIssueAlerts] = await Promise.all([
    detectJobFailures(),
    detectFixtureIssueAlerts(),
  ]);

  for (const a of [...jobFailureAlerts, ...fixtureIssueAlerts]) {
    currentFingerprints.add(a.fingerprint);
  }

  let resolvedCount = 0;
  for (const alert of activeAlerts) {
    if (!currentFingerprints.has(alert.fingerprint)) {
      await prisma.adminAlerts.update({
        where: { id: alert.id },
        data: { resolvedAt: new Date() },
      });
      resolvedCount++;
    }
  }

  if (resolvedCount > 0) {
    log.info({ resolvedCount }, "Auto-resolved alerts");
  }

  return resolvedCount;
}

/** Get all unresolved alerts sorted by severity + recency. */
export async function getActiveAlerts(): Promise<AdminAlertItem[]> {
  const rows = await prisma.adminAlerts.findMany({
    where: { resolvedAt: null },
    orderBy: [{ createdAt: "desc" }],
  });

  // Sort: critical first, then warning, then info
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  rows.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 3;
    const sb = severityOrder[b.severity] ?? 3;
    if (sa !== sb) return sa - sb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return rows.map(formatAlert);
}

/** Manually resolve an alert. */
export async function resolveAlert(id: number): Promise<AdminAlertItem | null> {
  const alert = await prisma.adminAlerts.findUnique({ where: { id } });
  if (!alert || alert.resolvedAt) return alert ? formatAlert(alert) : null;

  const updated = await prisma.adminAlerts.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
  return formatAlert(updated);
}

/** Get resolved alerts for audit trail. */
export async function getAlertHistory(limit = 50): Promise<AdminAlertItem[]> {
  const rows = await prisma.adminAlerts.findMany({
    where: { resolvedAt: { not: null } },
    orderBy: { resolvedAt: "desc" },
    take: limit,
  });
  return rows.map(formatAlert);
}

/** Mark alert as Slack-notified. */
export async function markSlackSent(id: number): Promise<void> {
  await prisma.adminAlerts.update({
    where: { id },
    data: { slackSentAt: new Date() },
  });
}

// ─── Detection Functions ───

async function detectJobFailures(): Promise<AlertInput[]> {
  const alerts: AlertInput[] = [];
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

  // Get all jobs and their recent runs
  const jobs = await prisma.jobs.findMany({
    where: { enabled: true },
    select: { key: true, description: true },
  });

  for (const job of jobs) {
    const recentRuns = await prisma.jobRuns.findMany({
      where: { jobKey: job.key, startedAt: { gte: cutoff } },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { status: true, errorMessage: true, startedAt: true },
    });

    if (recentRuns.length === 0) continue;

    // Count consecutive failures from most recent
    let consecutiveFailures = 0;
    for (const run of recentRuns) {
      if (run.status === RunStatus.failed) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures === 0) continue;

    const severity: AdminAlertSeverity = consecutiveFailures >= 3 ? "critical" : "warning";
    const latestError = recentRuns[0]?.errorMessage ?? "Unknown error";

    alerts.push({
      severity,
      category: "job_failure",
      title: `Job "${job.key}" failing`,
      description: `${consecutiveFailures} consecutive failure${consecutiveFailures > 1 ? "s" : ""} in the last 24h. Latest error: ${latestError.slice(0, 200)}`,
      fingerprint: `job_failure:${job.key}`,
      actionUrl: `/jobs/${job.key}`,
      actionLabel: "View Job",
      metadata: { jobKey: job.key, consecutiveFailures, latestError: latestError.slice(0, 500) },
    });
  }

  return alerts;
}

/**
 * Read active fixture issues from fixture_issues table
 * and convert them to admin alert inputs.
 */
async function detectFixtureIssueAlerts(): Promise<AlertInput[]> {
  const activeIssues = await prisma.fixtureIssues.findMany({
    where: { resolvedAt: null },
    select: {
      fixtureId: true,
      issueType: true,
      severity: true,
      metadata: true,
      fixture: {
        select: { id: true, name: true, state: true },
      },
    },
  });

  const alerts: AlertInput[] = [];

  // Group noScores into a single aggregate alert
  const noScoresIssues = activeIssues.filter((i) => i.issueType === "noScores");
  if (noScoresIssues.length > 0) {
    const count = noScoresIssues.length;
    alerts.push({
      severity: "warning",
      category: "data_quality",
      title: `${count} finished fixture${count > 1 ? "s" : ""} without scores`,
      description: `${count} fixture${count > 1 ? "s" : ""} in a finished state are missing score data.`,
      fingerprint: "data_quality:no_scores",
      actionUrl: "/fixtures?dataQuality=noScores",
      actionLabel: "View Fixtures",
      metadata: { count },
    });
  }

  // Individual alerts for stuck, overdue, unsettled, scoreMismatch
  for (const issue of activeIssues) {
    const meta = (typeof issue.metadata === "object" && issue.metadata && !Array.isArray(issue.metadata)
      ? issue.metadata
      : {}) as Record<string, unknown>;

    if (issue.issueType === "stuck") {
      alerts.push({
        severity: issue.severity as AdminAlertSeverity,
        category: "fixture_stuck",
        title: `Fixture stuck in ${issue.fixture.state}`,
        description: `"${issue.fixture.name}" stuck in ${issue.fixture.state}. ${meta.hoursStuck ?? "?"}h since start.`,
        fingerprint: `fixture_stuck:${issue.fixtureId}`,
        actionUrl: `/fixtures/${issue.fixtureId}`,
        actionLabel: "View Fixture",
        metadata: { fixtureId: issue.fixtureId, ...meta },
      });
    } else if (issue.issueType === "overdue") {
      alerts.push({
        severity: issue.severity as AdminAlertSeverity,
        category: "overdue_ns",
        title: `"${issue.fixture.name}" overdue (still NS)`,
        description: `Started ${meta.hoursOverdue ?? "?"}h ago, still in NS.`,
        fingerprint: `overdue_ns:${issue.fixtureId}`,
        actionUrl: `/fixtures/${issue.fixtureId}`,
        actionLabel: "View Fixture",
        metadata: { fixtureId: issue.fixtureId, ...meta },
      });
    } else if (issue.issueType === "unsettled") {
      const predCount = (meta.predictionCount as number) ?? 0;
      alerts.push({
        severity: "warning",
        category: "fixture_unsettled",
        title: `Unsettled predictions for "${issue.fixture.name}"`,
        description: `${predCount} unsettled prediction${predCount > 1 ? "s" : ""} for finished fixture "${issue.fixture.name}" (${issue.fixture.state}).`,
        fingerprint: `fixture_unsettled:${issue.fixtureId}`,
        actionUrl: `/fixtures/${issue.fixtureId}`,
        actionLabel: "View Fixture",
        metadata: { fixtureId: issue.fixtureId, ...meta },
      });
    }
    // scoreMismatch issues don't generate admin alerts (shown only on attention page)
  }

  return alerts;
}

// ─── Helpers ───

function formatAlert(row: {
  id: number;
  severity: string;
  category: string;
  title: string;
  description: string;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: unknown;
  fingerprint: string;
  createdAt: Date;
  resolvedAt: Date | null;
  slackSentAt: Date | null;
}): AdminAlertItem {
  return {
    id: row.id,
    severity: row.severity as AdminAlertItem["severity"],
    category: row.category as AdminAlertItem["category"],
    title: row.title,
    description: row.description,
    actionUrl: row.actionUrl,
    actionLabel: row.actionLabel,
    metadata: (typeof row.metadata === "object" && row.metadata && !Array.isArray(row.metadata)
      ? row.metadata
      : {}) as Record<string, unknown>,
    fingerprint: row.fingerprint,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    slackSentAt: row.slackSentAt?.toISOString() ?? null,
  };
}
