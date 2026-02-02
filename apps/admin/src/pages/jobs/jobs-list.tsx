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

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        (a.description ?? a.key).localeCompare(b.description ?? b.key)
      ),
    [jobs]
  );

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Jobs</h1>
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
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusDot job={j} />
                        <CardTitle className="text-sm truncate">
                          {titleCaseWords(jobNameFromKey(j.key))}
                        </CardTitle>
                      </div>
                    </div>
                    <CardDescription className="font-mono text-[11px] truncate">
                      {formatScheduleHuman(j.scheduleCron ?? null)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3 flex-1">
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
