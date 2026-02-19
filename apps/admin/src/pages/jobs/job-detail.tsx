import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/table/status-badge";
import { useJobFromDb, useJobRunsForJob } from "@/hooks/use-jobs";
import { useBookmakersFromProvider } from "@/hooks/use-bookmakers";
import { useMarketsFromProvider } from "@/hooks/use-markets";
import { jobsService } from "@/services/jobs.service";
import type { AdminJobDetailResponse } from "@repo/types";
import type { MultiSelectOption } from "@/components/filters/multi-select-combobox";
import {
  formatRelativeTime,
  formatDurationMs,
  formatRunSummary,
  jobNameFromKey,
  getRunReason,
  titleCaseWords,
  truncate,
} from "./jobs.utils";
import { JobConfigForm } from "./job-config-form";
import { useAlerts } from "@/hooks/use-dashboard";

export default function JobDetailPage() {
  const { jobKey } = useParams<{ jobKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cursorStack, setCursorStack] = useState<Array<number | null>>([null]);
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  const jobQuery = useJobFromDb(jobKey ?? null);
  const job = jobQuery.data?.data ?? null;

  const runsQuery = useJobRunsForJob(jobKey ?? null, {
    limit: 50,
    cursor: cursor ?? undefined,
  });
  const runs = runsQuery.data?.data ?? [];
  const nextCursor = runsQuery.data?.nextCursor ?? null;

  const { data: bookmakersProviderData } = useBookmakersFromProvider();
  const bookmakerOptions: MultiSelectOption[] = useMemo(() => {
    if (!bookmakersProviderData?.data) return [];
    const seen = new Set<string>();
    const out: MultiSelectOption[] = [];
    bookmakersProviderData.data.forEach((b) => {
      const id = String(b.externalId);
      const key = `${id}-${b.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ value: id, label: b.name });
    });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [bookmakersProviderData]);

  const { data: marketsProviderData } = useMarketsFromProvider();
  const marketOptions: MultiSelectOption[] = useMemo(() => {
    if (!marketsProviderData?.data) return [];
    return marketsProviderData.data
      .map((m) => ({ value: String(m.externalId), label: m.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [marketsProviderData]);

  const updateJobMutation = useMutation({
    mutationFn: async (vars: {
      jobKey: string;
      patch: {
        description?: string | null;
        enabled?: boolean;
        scheduleCron?: string | null;
        meta?: Record<string, unknown> | null;
      };
    }) => jobsService.updateJob(vars.jobKey, vars.patch),
    onSuccess: () => {
      toast.success("Job updated");
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db", jobKey] });
    },
    onError: (e: Error) => {
      toast.error("Update failed", { description: e.message });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: () => jobsService.runJob(jobKey!, false),
    onSuccess: () => {
      toast.success("Job triggered");
      queryClient.invalidateQueries({ queryKey: ["job-runs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "db", jobKey] });
    },
    onError: (e: Error) => {
      toast.error("Job trigger failed", { description: e.message });
    },
  });

  // Alert context for this job
  const { data: alertsData } = useAlerts();
  const jobAlerts = useMemo(
    () =>
      alertsData?.data?.filter(
        (a) =>
          a.category === "job_failure" &&
          a.fingerprint === `job_failure:${jobKey}`
      ) ?? [],
    [alertsData, jobKey]
  );

  // Failure pattern: count consecutive failures from most recent runs
  const failurePattern = useMemo(() => {
    const lastRuns = job?.lastRuns ?? [];
    if (!lastRuns.length || lastRuns[0].status !== "failed") return null;
    let consecutive = 0;
    for (const run of lastRuns) {
      if (run.status === "failed") {
        consecutive++;
      } else {
        break;
      }
    }
    return {
      consecutiveFailures: consecutive,
      firstFailedAt: lastRuns[consecutive - 1]?.startedAt ?? null,
      lastFailedAt: lastRuns[0]?.startedAt ?? null,
      lastError: lastRuns[0]?.errorMessage ?? null,
    };
  }, [job]);

  const canGoPrev = cursorStack.length > 1;
  const canGoNext = runs.length === 50 && nextCursor != null;

  if (!jobKey) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Missing job key.</p>
        <Button variant="link" onClick={() => navigate("/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  if (jobQuery.isLoading || !job) {
    return (
      <div className="p-6">
        {jobQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading job…</p>
        ) : jobQuery.isError ? (
          <>
            <p className="text-sm text-destructive">Failed to load job.</p>
            <Button variant="link" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Job not found.</p>
        )}
      </div>
    );
  }

  const jobForForm: AdminJobDetailResponse["data"] = job;

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold truncate">
            {titleCaseWords(jobNameFromKey(job.key))}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">{job.key}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate("/jobs")}>
          <span className="hidden sm:inline">Back to Jobs</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
        {/* Failure Pattern (shown when job is currently failing) */}
        {failurePattern && (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700 dark:text-red-400">
                Failure Pattern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {failurePattern.consecutiveFailures}
                  </span>{" "}
                  consecutive failure
                  {failurePattern.consecutiveFailures !== 1 ? "s" : ""}
                </span>
                {failurePattern.firstFailedAt && (
                  <span className="text-muted-foreground">
                    Since: {formatRelativeTime(failurePattern.firstFailedAt)}
                  </span>
                )}
              </div>
              {failurePattern.lastError && (
                <p className="text-xs text-muted-foreground font-mono bg-red-100/50 dark:bg-red-950/30 rounded px-2 py-1 truncate">
                  {failurePattern.lastError.slice(0, 200)}
                </p>
              )}
              {/* Alert context */}
              {jobAlerts.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {jobAlerts.map((a) => (
                    <p key={a.id}>
                      Alert: {a.title} — {a.description}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <JobConfigForm
              job={jobForForm}
              bookmakerOptions={bookmakerOptions}
              marketOptions={marketOptions}
              onSave={async (patch) => {
                await updateJobMutation.mutateAsync({ jobKey: job.key, patch });
              }}
              onRunNow={() => runJobMutation.mutate()}
              isSavePending={updateJobMutation.isPending}
              isRunPending={runJobMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y border-t">
              {runs.map((r) => {
                const reason = getRunReason(r.meta);
                const summary = formatRunSummary(r.meta);
                return (
                  <div
                    key={r.id}
                    className="px-3 py-3 space-y-1.5 cursor-pointer hover:bg-muted/50 active:bg-muted/70"
                    onClick={() =>
                      navigate(
                        `/jobs/${encodeURIComponent(jobKey)}/runs/${r.id}`
                      )
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        {r.status === "success" && reason && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            {reason}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(r.startedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatDurationMs(r.durationMs)}</span>
                      <span className="truncate text-right max-w-[60%]">{summary}</span>
                    </div>
                    {r.errorMessage && (
                      <p className="text-xs text-destructive truncate">
                        {truncate(r.errorMessage, 100)}
                      </p>
                    )}
                  </div>
                );
              })}
              {!runs.length && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No runs yet.
                </div>
              )}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="hidden sm:table-cell">Summary</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate(
                          `/jobs/${encodeURIComponent(jobKey)}/runs/${r.id}`
                        )
                      }
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={r.status} />
                          {r.status === "success" &&
                            getRunReason(r.meta) && (
                              <span className="hidden sm:inline text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                {getRunReason(r.meta)}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatRelativeTime(r.startedAt)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDurationMs(r.durationMs)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs max-w-[280px] truncate">
                        {formatRunSummary(r.meta)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {r.status === "success" && getRunReason(r.meta)
                          ? getRunReason(r.meta)
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.errorMessage
                          ? `${r.errorMessage.slice(0, 80)}${r.errorMessage.length > 80 ? "…" : ""}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!runs.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No runs yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t">
              <div className="text-xs text-muted-foreground">
                {runs.length} runs
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCursorStack((s) => s.slice(0, -1))}
                  disabled={!canGoPrev}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    nextCursor != null &&
                    setCursorStack((s) => [...s, nextCursor])
                  }
                  disabled={!canGoNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
