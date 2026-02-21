/**
 * Admin Alerts Service
 * --------------------
 * Generates, auto-resolves, and manages admin alerts.
 *
 * Alert categories:
 * - job_failure: Jobs failing consecutively (critical if 3+, warning if 1-2)
 * - fixture_stuck: Live fixtures not updated (critical >6h, warning 3-6h)
 * - fixture_unsettled: Finished fixtures with unsettled predictions (warning)
 * - data_quality: Finished fixtures missing scores (warning)
 * - sync_needed: New seasons available from provider (info)
 * - overdue_ns: Fixtures past start time still in NS state (warning)
 */

import { prisma, Prisma, RunStatus } from "@repo/db";
import type { FixtureState } from "@repo/db";
import type { AdminAlertItem, AdminAlertSeverity, AdminAlertCategory } from "@repo/types";
import { LIVE_STATES, FINISHED_STATES } from "@repo/utils";
import { nowUnixSeconds } from "../../utils/dates";
import { getLogger } from "../../logger";

const log = getLogger("AlertsService");

const LIVE_STATES_ARR = [...LIVE_STATES] as FixtureState[];
const FINISHED_STATES_ARR = [...FINISHED_STATES] as FixtureState[];

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
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
  const alerts: AlertInput[] = [];

  const [
    jobFailureAlerts,
    stuckFixtureAlerts,
    unsettledAlerts,
    dataQualityAlerts,
    overdueNsAlerts,
  ] = await Promise.all([
    detectJobFailures(),
    detectStuckFixtures(),
    detectUnsettledFixtures(),
    detectDataQualityIssues(),
    detectOverdueNs(),
  ]);

  alerts.push(
    ...jobFailureAlerts,
    ...stuckFixtureAlerts,
    ...unsettledAlerts,
    ...dataQualityAlerts,
    ...overdueNsAlerts,
  );

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
  const [
    jobFailureAlerts,
    stuckFixtureAlerts,
    unsettledAlerts,
    dataQualityAlerts,
    overdueNsAlerts,
  ] = await Promise.all([
    detectJobFailures(),
    detectStuckFixtures(),
    detectUnsettledFixtures(),
    detectDataQualityIssues(),
    detectOverdueNs(),
  ]);

  for (const a of [
    ...jobFailureAlerts,
    ...stuckFixtureAlerts,
    ...unsettledAlerts,
    ...dataQualityAlerts,
    ...overdueNsAlerts,
  ]) {
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

async function detectStuckFixtures(): Promise<AlertInput[]> {
  const alerts: AlertInput[] = [];
  const nowTs = nowUnixSeconds();
  const warningThreshold = 3 * 60 * 60; // 3 hours
  const criticalThreshold = 6 * 60 * 60; // 6 hours

  const stuckFixtures = await prisma.fixtures.findMany({
    where: {
      externalId: { gte: 0 },
      state: { in: LIVE_STATES_ARR },
      startTs: { lt: nowTs - warningThreshold },
    },
    select: { id: true, name: true, state: true, startTs: true, lastProviderState: true },
  });

  for (const f of stuckFixtures) {
    const hoursStuck = Math.round((nowTs - f.startTs) / 3600);
    const severity: AdminAlertSeverity = (nowTs - f.startTs) >= criticalThreshold ? "critical" : "warning";
    const providerNote = f.lastProviderState
      ? ` Provider: ${f.lastProviderState}.`
      : "";

    alerts.push({
      severity,
      category: "fixture_stuck",
      title: `Fixture stuck in ${f.state}`,
      description: `"${f.name}" started ${hoursStuck}h ago, still in ${f.state}.${providerNote}`,
      fingerprint: `fixture_stuck:${f.id}`,
      actionUrl: `/fixtures/${f.id}`,
      actionLabel: "View Fixture",
      metadata: { fixtureId: f.id, fixtureName: f.name, state: f.state, hoursStuck, lastProviderState: f.lastProviderState },
    });
  }

  return alerts;
}

async function detectUnsettledFixtures(): Promise<AlertInput[]> {
  // Get unsettled prediction count per groupFixture
  const unsettledGroups = await prisma.groupPredictions.findMany({
    where: { settledAt: null },
    select: { groupFixtureId: true },
    distinct: ["groupFixtureId"],
  });

  if (unsettledGroups.length === 0) return [];

  const groupFixtureIds = unsettledGroups.map((r) => r.groupFixtureId);
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { id: { in: groupFixtureIds } },
    select: { fixtureId: true },
  });

  const fixtureIds = [...new Set(groupFixtures.map((gf) => gf.fixtureId))];

  // Get actual finished fixtures with unsettled predictions
  const finishedFixtures = await prisma.fixtures.findMany({
    where: {
      id: { in: fixtureIds },
      externalId: { gte: 0 },
      state: { in: FINISHED_STATES_ARR },
    },
    select: { id: true, name: true, state: true },
  });

  if (finishedFixtures.length === 0) return [];

  // Count predictions per fixture
  const finishedFixtureIds = finishedFixtures.map((f) => f.id);
  const gfRows = await prisma.groupFixtures.findMany({
    where: { fixtureId: { in: finishedFixtureIds } },
    select: { id: true, fixtureId: true },
  });
  const gfIdsByFixture = new Map<number, number[]>();
  for (const gf of gfRows) {
    const arr = gfIdsByFixture.get(gf.fixtureId) ?? [];
    arr.push(gf.id);
    gfIdsByFixture.set(gf.fixtureId, arr);
  }

  const alerts: AlertInput[] = [];
  for (const fixture of finishedFixtures) {
    const gfIds = gfIdsByFixture.get(fixture.id) ?? [];
    const predCount = gfIds.length > 0
      ? await prisma.groupPredictions.count({
          where: { groupFixtureId: { in: gfIds }, settledAt: null },
        })
      : 0;

    if (predCount === 0) continue;

    alerts.push({
      severity: "warning",
      category: "fixture_unsettled",
      title: `Unsettled predictions for "${fixture.name}"`,
      description: `${predCount} unsettled prediction${predCount > 1 ? "s" : ""} for finished fixture "${fixture.name}" (${fixture.state}).`,
      fingerprint: `fixture_unsettled:${fixture.id}`,
      actionUrl: `/fixtures/${fixture.id}`,
      actionLabel: "View Fixture",
      metadata: { fixtureId: fixture.id, fixtureName: fixture.name, predictionCount: predCount, state: fixture.state },
    });
  }

  return alerts;
}

async function detectDataQualityIssues(): Promise<AlertInput[]> {
  const count = await prisma.fixtures.count({
    where: {
      externalId: { gte: 0 },
      state: { in: FINISHED_STATES_ARR },
      OR: [{ homeScore90: null }, { awayScore90: null }],
    },
  });

  if (count === 0) return [];

  return [
    {
      severity: "warning",
      category: "data_quality",
      title: `${count} finished fixture${count > 1 ? "s" : ""} without scores`,
      description: `${count} fixture${count > 1 ? "s" : ""} in a finished state (FT/AET/FT_PEN) are missing score data.`,
      fingerprint: "data_quality:no_scores",
      actionUrl: "/fixtures?dataQuality=noScores",
      actionLabel: "View Fixtures",
      metadata: { count },
    },
  ];
}

async function detectOverdueNs(): Promise<AlertInput[]> {
  const nowTs = nowUnixSeconds();
  const FOUR_HOURS_S = 4 * 60 * 60;

  const overdueFixtures = await prisma.fixtures.findMany({
    where: { externalId: { gte: 0 }, state: "NS", startTs: { lt: nowTs } },
    select: { id: true, name: true, startTs: true, lastProviderState: true, lastProviderCheckAt: true },
    orderBy: { startTs: "asc" },
  });

  if (overdueFixtures.length === 0) return [];

  const alerts: AlertInput[] = [];

  for (const f of overdueFixtures) {
    const overdueSeconds = nowTs - f.startTs;
    const hoursOverdue = Math.round(overdueSeconds / 3600);
    const severity: AdminAlertSeverity = overdueSeconds >= FOUR_HOURS_S ? "critical" : "warning";

    let providerNote = "";
    if (!f.lastProviderCheckAt) {
      providerNote = " Never checked against provider.";
    } else if (f.lastProviderState === "NS") {
      providerNote = " Provider also shows NS (delayed).";
    } else if (f.lastProviderState) {
      providerNote = ` Provider shows ${f.lastProviderState}.`;
    }

    alerts.push({
      severity,
      category: "overdue_ns",
      title: `"${f.name}" overdue (still NS)`,
      description: `Started ${hoursOverdue}h ago, still in NS.${providerNote}`,
      fingerprint: `overdue_ns:${f.id}`,
      actionUrl: `/fixtures/${f.id}`,
      actionLabel: "View Fixture",
      metadata: { fixtureId: f.id, fixtureName: f.name, hoursOverdue, lastProviderState: f.lastProviderState },
    });
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
