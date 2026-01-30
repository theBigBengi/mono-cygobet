import { useMemo, useState, useDeferredValue, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/table/status-badge";
import { TabsContent } from "@/components/ui/tabs";
import { useJobRunsFromDb } from "@/hooks/use-jobs";
import type { AdminJobRunsListResponse } from "@repo/types";
import {
  formatDateTime,
  formatDurationMs,
  truncate,
  jobNameFromKey,
  getEnvLabel,
} from "./jobs.utils";

type RunRow = AdminJobRunsListResponse["data"][0];

interface JobRunsTabProps {
  jobOptions: string[];
  jobsCount: number;
  onOpenRun: (run: RunRow) => void;
}

export function JobRunsTab({
  jobOptions,
  jobsCount,
  onOpenRun,
}: JobRunsTabProps) {
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const deferredSearch = useDeferredValue(search);

  const [pageSize, setPageSize] = useState<number>(50);
  const [cursorStack, setCursorStack] = useState<Array<number | null>>([null]);
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  const runsQuery = useJobRunsFromDb({
    limit: pageSize,
    cursor,
    jobId: jobFilter === "all" ? undefined : jobFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: deferredSearch.trim() || undefined,
  });

  useEffect(() => {
    setCursorStack([null]);
  }, [deferredSearch]);

  const runs = useMemo(
    () => runsQuery.data?.data ?? [],
    [runsQuery.data]
  );

  const summary = useMemo(() => {
    const serverSummary = runsQuery.data?.summary;
    return {
      totalJobs: jobsCount,
      runningCount: serverSummary?.running ?? 0,
      failedCount: serverSummary?.failed ?? 0,
      successCount: serverSummary?.success ?? 0,
    };
  }, [jobsCount, runsQuery.data]);

  const canGoPrev = cursorStack.length > 1;
  const canGoNext =
    runs.length === pageSize && !!runsQuery.data?.nextCursor;

  const goPrev = () => {
    if (!canGoPrev) return;
    setCursorStack((s) => s.slice(0, -1));
  };

  const goNext = () => {
    if (!runsQuery.data?.nextCursor) return;
    setCursorStack((s) => [...s, runsQuery.data!.nextCursor ?? null]);
  };

  const onChangePageSize = (v: string) => {
    const next = Number(v);
    setPageSize(next);
    setCursorStack([null]);
  };

  return (
    <TabsContent
      value="runs"
      className="flex-1 min-h-0 overflow-hidden mt-4"
    >
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="text-muted-foreground">
              Total jobs:{" "}
              <span className="text-foreground">{summary.totalJobs}</span>
            </span>
            <span className="text-muted-foreground">
              Running:{" "}
              <span className="text-foreground">
                {summary.runningCount}
              </span>
            </span>
            <span className="text-muted-foreground">
              Failed runs:{" "}
              <span className="text-foreground">{summary.failedCount}</span>
            </span>
            <span className="text-muted-foreground">
              Success runs:{" "}
              <span className="text-foreground">
                {summary.successCount}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col h-full min-h-0 overflow-hidden mt-4">
        <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center mb-3">
          <Select
            value={jobFilter}
            onValueChange={(v) => {
              setJobFilter(v);
              setCursorStack([null]);
            }}
          >
            <SelectTrigger className="sm:w-[260px]">
              <SelectValue placeholder="Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobOptions.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setCursorStack([null]);
            }}
          >
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">success</SelectItem>
              <SelectItem value="failed">failed</SelectItem>
              <SelectItem value="running">running</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job / run id / batch id"
            className="sm:max-w-[320px]"
          />

          <div className="flex items-center gap-2 sm:ml-auto">
            <Select value={String(pageSize)} onValueChange={onChangePageSize}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Env</TableHead>
                    <TableHead>StartedAt</TableHead>
                    <TableHead>FinishedAt</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => onOpenRun(r)}
                    >
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {r.id}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap max-w-[520px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">
                            {jobNameFromKey(r.jobKey)}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            {r.jobKey}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {getEnvLabel((r.meta ?? {}) as Record<string, unknown>)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDateTime(r.startedAt)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDateTime(r.finishedAt)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDurationMs(r.durationMs)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.errorMessage
                          ? truncate(r.errorMessage, 120)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!runs.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No runs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex-shrink-0 px-4 py-3 border-t flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {runs.length} runs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={goPrev}
                  disabled={!canGoPrev}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={goNext}
                  disabled={!canGoNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
