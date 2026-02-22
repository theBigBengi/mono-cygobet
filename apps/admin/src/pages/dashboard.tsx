import { HeaderActions } from "@/contexts/header-actions";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  XCircle,
  CheckCircle2,
  Radio,
  Bell,
  ExternalLink,
} from "lucide-react";
import { useDashboard, useAlerts } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboardResponse, AdminAlertItem } from "@repo/types";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboard();
  const { data: alertsData, isLoading: alertsLoading } = useAlerts();

  if (isError) {
    return (
      <div className="flex-1 p-4 sm:p-6">
        <div className="text-destructive">
          Failed to load dashboard: {error?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  const jobs = data?.jobs;
  const fixtures = data?.fixtures;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <HeaderActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching || isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </HeaderActions>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
        {/* ── Section 0: Alerts ── */}
        <AlertsSection alerts={alertsData?.data} loading={alertsLoading} />

        {/* ── Section 1: Jobs ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Jobs</CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : jobs ? (
                <Badge
                  variant="outline"
                  className={
                    jobs.failingJobs.length > 0
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                      : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                  }
                >
                  {jobs.healthyCount}/{jobs.totalEnabled} healthy
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : !jobs?.failingJobs.length ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                All {jobs?.totalEnabled} jobs are running normally.
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.failingJobs.map((job) => (
                  <JobBanner key={job.key} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 2: Fixtures ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fixtures</CardTitle>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : fixtures ? (
                  <>
                    {fixtures.liveCount > 0 && (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
                        <Radio className="h-3 w-3 mr-1" />
                        {fixtures.liveCount} live
                      </Badge>
                    )}
                  </>
                ) : null}
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link to="/fixtures">View all</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : !fixtures ? null : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                {fixtures.liveCount > 0
                  ? `${fixtures.liveCount} live fixture${fixtures.liveCount !== 1 ? "s" : ""} being tracked.`
                  : "No live fixtures right now."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Job Banner ───

function JobBanner({
  job,
}: {
  job: AdminDashboardResponse["jobs"]["failingJobs"][number];
}) {
  return (
    <Link
      to={`/jobs/${encodeURIComponent(job.key)}`}
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20 px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
    >
      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          {job.description ?? job.key}
          <span className="ml-2 text-xs font-normal text-red-500 dark:text-red-500">
            {job.consecutiveFailures}x consecutive failure{job.consecutiveFailures !== 1 ? "s" : ""}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          Last failed{" "}
          {formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true })}
          {job.lastError && (
            <> — {job.lastError.slice(0, 120)}{job.lastError.length > 120 ? "…" : ""}</>
          )}
        </p>
      </div>
      <span className="text-xs text-red-500 dark:text-red-400 whitespace-nowrap flex-shrink-0">
        View →
      </span>
    </Link>
  );
}

// ─── Alerts Section ───

const SEVERITY_STYLES = {
  critical: {
    border: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
    icon: "text-red-500",
    title: "text-red-700 dark:text-red-400",
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400",
  },
  warning: {
    border: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    icon: "text-amber-500",
    title: "text-amber-700 dark:text-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400",
  },
  info: {
    border: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
    icon: "text-blue-500",
    title: "text-blue-700 dark:text-blue-400",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400",
  },
} as const;

function AlertsSection({
  alerts,
  loading,
}: {
  alerts: AdminAlertItem[] | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Alerts</CardTitle>
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Alerts</CardTitle>
            <Badge
              variant="outline"
              className={
                criticalCount > 0
                  ? SEVERITY_STYLES.critical.badge
                  : warningCount > 0
                    ? SEVERITY_STYLES.warning.badge
                    : SEVERITY_STYLES.info.badge
              }
            >
              {alerts.length} active
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertBanner key={alert.id} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertBanner({
  alert,
}: {
  alert: AdminAlertItem;
}) {
  const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${styles.border}`}>
      <div className="flex items-start gap-2.5">
        <Bell className={`h-4 w-4 flex-shrink-0 mt-0.5 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${styles.title}`}>{alert.title}</p>
            <Badge variant="outline" className={`text-[10px] ${styles.badge}`}>
              {alert.severity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            </p>
            {alert.actionUrl && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                <Link to={alert.actionUrl}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {alert.actionLabel ?? "View"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
