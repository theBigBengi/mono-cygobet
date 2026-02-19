import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobsFromDb } from "@/hooks/use-jobs";
import { jobsService } from "@/services/jobs.service";
import type { AdminJobsListResponse } from "@repo/types";
import {
  formatRelativeTime,
  formatDurationMs,
  formatScheduleHuman,
  titleCaseWords,
  jobNameFromKey,
  isNoOp,
} from "./jobs.utils";

type JobRow = AdminJobsListResponse["data"][0];

function StatusDot({ job }: { job: JobRow }) {
  const lastRun = job.lastRun;
  if (!lastRun) {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full bg-muted-foreground/40"
        title="No run yet"
      />
    );
  }
  if (lastRun.status === "failed") {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full bg-red-500"
        title="Last run failed"
      />
    );
  }
  if (lastRun.status === "success" && isNoOp((lastRun.meta ?? {}) as Record<string, unknown>, lastRun.rowsAffected)) {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full bg-amber-500"
        title="Last run was no-op"
      />
    );
  }
  return (
    <span
      className="inline-block h-3 w-3 rounded-full bg-green-500"
      title="Healthy"
    />
  );
}

function MiniBar({ job }: { job: JobRow }) {
  const lastRuns = job.lastRuns ?? [];
  if (!lastRuns.length) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-2 flex-1 min-w-0 rounded-sm bg-muted"
            title="No run"
          />
        ))}
      </div>
    );
  }
  type RunSummary = (typeof lastRuns)[number];
  const ordered: (RunSummary | null)[] = [...lastRuns].reverse();
  while (ordered.length < 10) ordered.push(null);
  const slice = ordered.slice(0, 10);
  return (
    <div className="flex gap-0.5" title="Last 10 runs (newest right)">
      {slice.map((r, i) =>
        r ? (
          <div
            key={r.id}
            className={`h-2 flex-1 min-w-0 rounded-sm ${
              r.status === "failed"
                ? "bg-red-500"
                : r.status === "success" &&
                    isNoOp((r.meta ?? {}) as Record<string, unknown>, r.rowsAffected ?? null)
                  ? "bg-amber-500"
                  : "bg-green-500"
            }`}
            title={`Run #${r.id} ${r.status}`}
          />
        ) : (
          <div key={`empty-${i}`} className="h-2 flex-1 min-w-0 rounded-sm bg-muted" />
        )
      )}
    </div>
  );
}

export default function JobsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jobsQuery = useJobsFromDb();
  const jobs = jobsQuery.data?.data ?? [];

  const runJobMutation = useMutation({
    mutationKey: ["run-job"],
    mutationFn: async (vars: { jobKey: string }) =>
      jobsService.runJob(vars.jobKey, false),
    onSuccess: (_res, vars) => {
      toast.success("Job triggered", { description: vars.jobKey });
      queryClient.invalidateQueries({ queryKey: ["job-runs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
    },
    onError: (e: Error) => {
      toast.error("Job trigger failed", { description: e.message });
    },
  });

  // Sort: failing jobs first, then alphabetically
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const aFailing = a.lastRun?.status === "failed" ? 0 : 1;
        const bFailing = b.lastRun?.status === "failed" ? 0 : 1;
        if (aFailing !== bFailing) return aFailing - bFailing;
        return (a.description ?? a.key).localeCompare(b.description ?? b.key);
      }),
    [jobs]
  );

  // Health summary
  const healthSummary = useMemo(() => {
    const total = jobs.filter((j) => j.enabled).length;
    const failing = jobs.filter(
      (j) => j.enabled && j.lastRun?.status === "failed"
    ).length;
    const healthy = total - failing;
    return { total, healthy, failing };
  }, [jobs]);

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-3 space-y-2">
        {/* Health summary bar */}
        {jobs.length > 0 && (
          <div
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
              healthSummary.failing > 0
                ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                : "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
            }`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                healthSummary.failing > 0 ? "bg-red-500" : "bg-green-500"
              }`}
            />
            <span>
              <span className="font-medium">
                {healthSummary.healthy}/{healthSummary.total}
              </span>{" "}
              healthy
            </span>
            {healthSummary.failing > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {healthSummary.failing} failing
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {jobsQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading jobs…
          </div>
        ) : jobsQuery.isError ? (
          <div className="py-10 text-center text-sm text-destructive">
            Failed to load jobs.
          </div>
        ) : !sortedJobs.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No jobs found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedJobs.map((j) => {
              const isPending =
                runJobMutation.isPending &&
                runJobMutation.variables?.jobKey === j.key;
              const lastRun = j.lastRun;

              return (
                <Card
                  key={j.key}
                  className="flex flex-col cursor-default hover:bg-muted/50 transition-colors"
                >
                  <CardHeader className={`pb-3 ${!j.enabled ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusDot job={j} />
                        <CardTitle className="text-sm truncate">
                          {titleCaseWords(jobNameFromKey(j.key))}
                        </CardTitle>
                      </div>
                      <Badge
                        variant={j.enabled ? "default" : "secondary"}
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${
                          j.enabled
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {j.enabled ? "On" : "Off"}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-[11px] truncate">
                      {formatScheduleHuman(j.scheduleCron ?? null)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className={`pt-0 space-y-3 flex-1 ${!j.enabled ? "opacity-50" : ""}`}>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Last run
                      </div>
                      <div className="mt-1 text-xs">
                        {lastRun ? (
                          <>
                            {formatRelativeTime(lastRun.startedAt)} •{" "}
                            {formatDurationMs(lastRun.durationMs)}
                            {lastRun.rowsAffected != null && (
                              <> • {lastRun.rowsAffected} rows</>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    <div>
                      <MiniBar job={j} />
                    </div>
                  </CardContent>

                  <CardFooter className="justify-end gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => navigate(`/jobs/${encodeURIComponent(j.key)}`)}
                    >
                      Configure
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => runJobMutation.mutate({ jobKey: j.key })}
                      disabled={!j.runnable || isPending}
                    >
                      {isPending ? "Running…" : "Run Now"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
