import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  TimerOff,
  FileWarning,
  CheckCircle2,
  Radio,
  Bell,
  Check,
} from "lucide-react";
import { useDashboard, useAlerts, useResolveAlert } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboardResponse, AdminAlertItem } from "@repo/types";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboard();
  const { data: alertsData, isLoading: alertsLoading } = useAlerts();
  const resolveAlert = useResolveAlert();

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
      <div className="flex-shrink-0 mb-4 flex items-center justify-between">
        <h1 className="text-lg sm:text-2xl font-semibold">Dashboard</h1>
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
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
        {/* ── Section 0: Alerts ── */}
        <AlertsSection alerts={alertsData?.data} loading={alertsLoading} onResolve={(id) => resolveAlert.mutate(id)} resolving={resolveAlert.isPending} />

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
                  <Link to="/fixtures">View all →</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : !fixtures ? null : (
              <FixtureBanners fixtures={fixtures} />
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

// ─── Fixture Banners ───

function FixtureBanners({
  fixtures,
}: {
  fixtures: AdminDashboardResponse["fixtures"];
}) {
  const hasIssues =
    fixtures.stuckCount > 0 ||
    fixtures.unsettled.length > 0 ||
    fixtures.overdueNsCount > 0 ||
    fixtures.noScoresCount > 0;

  if (!hasIssues && fixtures.pendingSettlement === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        No fixture issues detected.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fixtures.stuckCount > 0 && (
        <IssueBanner
          icon={Zap}
          variant="red"
          title={`${fixtures.stuckCount} fixture${fixtures.stuckCount !== 1 ? "s" : ""} stuck in LIVE`}
          description={buildStuckDescription(fixtures.stuck)}
        />
      )}

      {fixtures.unsettled.length > 0 && (
        <IssueBanner
          icon={Clock}
          variant="amber"
          title={`${fixtures.unsettled.length} unsettled fixture${fixtures.unsettled.length !== 1 ? "s" : ""}`}
          description={buildUnsettledDescription(fixtures.unsettled)}
        />
      )}

      {fixtures.overdueNsCount > 0 && (
        <IssueBanner
          icon={TimerOff}
          variant="orange"
          title={`${fixtures.overdueNsCount} overdue fixture${fixtures.overdueNsCount !== 1 ? "s" : ""} still showing NS`}
          description={buildOverdueDescription(fixtures.overdueNs)}
        />
      )}

      {fixtures.noScoresCount > 0 && (
        <IssueBanner
          icon={FileWarning}
          variant="yellow"
          title={`${fixtures.noScoresCount} finished fixture${fixtures.noScoresCount !== 1 ? "s" : ""} missing scores`}
          description={buildNoScoresDescription(fixtures.noScores)}
        />
      )}

      {fixtures.pendingSettlement > 0 && !fixtures.unsettled.length && (
        <IssueBanner
          icon={AlertTriangle}
          variant="amber"

          title={`${fixtures.pendingSettlement} fixture${fixtures.pendingSettlement !== 1 ? "s" : ""} pending settlement`}
          description="Finished fixtures with predictions waiting to be settled."
        />
      )}
    </div>
  );
}

// ─── Generic Issue Banner ───

const BANNER_STYLES = {
  red: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30",
  amber: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30",
  orange: "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30",
  yellow: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20 hover:bg-yellow-50 dark:hover:bg-yellow-950/30",
} as const;

const ICON_STYLES = {
  red: "text-red-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
} as const;

const TITLE_STYLES = {
  red: "text-red-700 dark:text-red-400",
  amber: "text-amber-700 dark:text-amber-400",
  orange: "text-orange-700 dark:text-orange-400",
  yellow: "text-yellow-700 dark:text-yellow-400",
} as const;

function IssueBanner({
  icon: Icon,
  variant,
  title,
  description,
}: {
  icon: typeof AlertTriangle;
  variant: keyof typeof BANNER_STYLES;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${BANNER_STYLES[variant]}`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${ICON_STYLES[variant]}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${TITLE_STYLES[variant]}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
    </div>
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
  onResolve,
  resolving,
}: {
  alerts: AdminAlertItem[] | undefined;
  loading: boolean;
  onResolve: (id: number) => void;
  resolving: boolean;
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
            <AlertBanner key={alert.id} alert={alert} onResolve={onResolve} resolving={resolving} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertBanner({
  alert,
  onResolve,
  resolving,
}: {
  alert: AdminAlertItem;
  onResolve: (id: number) => void;
  resolving: boolean;
}) {
  const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${styles.border}`}>
      <Bell className={`h-4 w-4 flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${styles.title}`}>{alert.title}</p>
          <Badge variant="outline" className={`text-[10px] ${styles.badge}`}>
            {alert.severity}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {alert.actionUrl && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to={alert.actionUrl}>{alert.actionLabel ?? "View"}</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => onResolve(alert.id)}
          disabled={resolving}
        >
          <Check className="h-3 w-3 mr-1" />
          Resolve
        </Button>
      </div>
    </div>
  );
}

// ─── Description builders ───

function buildStuckDescription(
  stuck: AdminDashboardResponse["fixtures"]["stuck"]
): string {
  const longest = stuck[0]; // sorted by updatedAt asc = longest stuck first
  const since = formatDistanceToNow(new Date(longest.stuckSince));
  if (stuck.length === 1) {
    return `${longest.name} has been in ${longest.state} for ${since}.`;
  }
  return `Longest: ${longest.name} (${since} in ${longest.state}). ${stuck.length - 1} other${stuck.length - 1 !== 1 ? "s" : ""} also stuck.`;
}

function buildUnsettledDescription(
  unsettled: AdminDashboardResponse["fixtures"]["unsettled"]
): string {
  const totalPredictions = unsettled.reduce((sum, f) => sum + f.predictionCount, 0);
  if (unsettled.length === 1) {
    return `${unsettled[0].name} — ${totalPredictions} prediction${totalPredictions !== 1 ? "s" : ""} waiting for settlement.`;
  }
  return `${totalPredictions} total prediction${totalPredictions !== 1 ? "s" : ""} across ${unsettled.length} fixtures waiting for settlement.`;
}

function buildOverdueDescription(
  overdueNs: AdminDashboardResponse["fixtures"]["overdueNs"]
): string {
  const most = overdueNs[0]; // sorted by startTs asc = most overdue first
  if (overdueNs.length === 1) {
    return `${most.name} is ${most.hoursOverdue}h past its scheduled start time.`;
  }
  return `Most overdue: ${most.name} (${most.hoursOverdue}h). ${overdueNs.length - 1} other${overdueNs.length - 1 !== 1 ? "s" : ""} also overdue.`;
}

function buildNoScoresDescription(
  noScores: AdminDashboardResponse["fixtures"]["noScores"]
): string {
  if (noScores.length === 1) {
    return `${noScores[0].name} (${noScores[0].state}) finished without score data.`;
  }
  return `${noScores.length} matches finished without score data. May need a re-sync from the provider.`;
}
