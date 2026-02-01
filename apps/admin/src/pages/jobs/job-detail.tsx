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
} from "./jobs.utils";
import { JobConfigForm } from "./job-config-form";

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
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {titleCaseWords(jobNameFromKey(job.key))}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{job.key}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/jobs")}>
          Back to Jobs
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
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
            <div className="overflow-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Error</TableHead>
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
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
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
                      <TableCell className="text-xs max-w-[280px] truncate">
                        {formatRunSummary(r.meta)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.status === "success" && getRunReason(r.meta)
                          ? getRunReason(r.meta)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
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
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-xs text-muted-foreground">
                Showing {runs.length} runs
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
