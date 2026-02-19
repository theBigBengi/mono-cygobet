import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/table/status-badge";
import { useRun, useRunItems } from "@/hooks/use-jobs";
import { ArrowLeft } from "lucide-react";
import {
  formatDateTime,
  formatDurationMs,
  formatRelativeTime,
  jobNameFromKey,
  titleCaseWords,
  camelToHuman,
} from "./jobs.utils";

export default function RunDetailPage() {
  const { jobKey, runId: runIdParam } = useParams<{
    jobKey: string;
    runId: string;
  }>();
  const navigate = useNavigate();

  const runId =
    runIdParam != null && /^\d+$/.test(runIdParam)
      ? parseInt(runIdParam, 10)
      : null;

  const [itemsPage, setItemsPage] = useState(1);
  const [itemsStatusFilter, setItemsStatusFilter] = useState<string>("all");
  const [itemsActionFilter, setItemsActionFilter] = useState<string>("all");

  const runQuery = useRun(runId);
  const run = runQuery.data?.data ?? null;

  const runItemsQuery = useRunItems(runId, {
    page: itemsPage,
    perPage: 50,
    status: itemsStatusFilter === "all" ? undefined : itemsStatusFilter,
    action: itemsActionFilter === "all" ? undefined : itemsActionFilter,
  });
  const items = runItemsQuery.data?.data ?? [];
  const itemsPagination = runItemsQuery.data?.pagination;

  if (!jobKey || runId == null || !Number.isFinite(runId)) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Invalid run.</p>
        <Button variant="link" onClick={() => navigate("/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  if (runQuery.isLoading || !run) {
    return (
      <div className="p-6">
        {runQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading run…</p>
        ) : runQuery.isError ? (
          <>
            <p className="text-sm text-destructive">Failed to load run.</p>
            <Button
              variant="link"
              onClick={() => navigate(`/jobs/${encodeURIComponent(jobKey)}`)}
            >
              Back to Job
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Run not found.</p>
        )}
      </div>
    );
  }

  const meta = (run.meta ?? {}) as Record<string, unknown>;
  const standardKeys = ["inserted", "updated", "skipped", "fail"];
  const hasStandard = standardKeys.some(
    (k) => typeof meta[k] === "number"
  );
  const inserted =
    typeof meta["inserted"] === "number" ? meta["inserted"] : null;
  const updated = typeof meta["updated"] === "number" ? meta["updated"] : null;
  const skipped = typeof meta["skipped"] === "number" ? meta["skipped"] : null;
  const failed =
    typeof meta["fail"] === "number" ? meta["fail"] : null;

  const excludeSummaryKeys = new Set([
    "batchId",
    "jobRunId",
    "environment",
    "reason",
  ]);
  const dynamicSummaryEntries = hasStandard
    ? []
    : Object.entries(meta).filter(([key, value]) => {
        if (excludeSummaryKeys.has(key)) return false;
        return (
          typeof value === "number" ||
          typeof value === "string" ||
          typeof value === "boolean"
        );
      });

  function formatChanges(ch: unknown): string {
    if (ch == null || typeof ch !== "object") return "—";
    const obj = ch as Record<string, unknown>;
    const parts = Object.entries(obj).map(
      ([k, v]) => `${k}: ${String(v ?? "—")}`
    );
    return parts.length ? parts.join(", ") : "—";
  }

  function getActionLabel(item: (typeof items)[number]): string {
    const m = (item.meta ?? {}) as Record<string, unknown>;
    const action = m["action"];
    if (typeof action === "string") return action;
    if (item.status === "success") return "success";
    if (item.status === "skipped") return "skipped";
    if (item.status === "failed") return "failed";
    return item.status;
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      {/* Header */}
      <div className="flex-shrink-0 mb-2 sm:mb-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
          onClick={() => navigate(`/jobs/${encodeURIComponent(jobKey)}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm sm:text-xl font-semibold truncate min-w-0">
          <span className="hidden sm:inline">{titleCaseWords(jobNameFromKey(run.jobKey))} — </span>
          Run #{run.id}
        </h1>
        <StatusBadge status={run.status} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-3 sm:space-y-6">
        {/* Run info — compact on mobile, grid on desktop */}
        <Card>
          <CardContent className="px-3 py-3 sm:p-6">
            <div className="hidden sm:block text-base font-semibold mb-3">Run info</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 sm:gap-4 text-[11px] sm:text-sm">
              <div className="min-w-0">
                <div className="text-muted-foreground">Started</div>
                <div className="font-medium truncate">
                  <span className="sm:hidden">{formatRelativeTime(run.startedAt)}</span>
                  <span className="hidden sm:inline">{formatDateTime(run.startedAt)}</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-muted-foreground">Finished</div>
                <div className="font-medium truncate">
                  <span className="sm:hidden">{formatRelativeTime(run.finishedAt)}</span>
                  <span className="hidden sm:inline">{formatDateTime(run.finishedAt)}</span>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-medium">{formatDurationMs(run.durationMs)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-muted-foreground">Trigger</div>
                <div className="font-medium truncate">{run.trigger}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="px-3 py-3 sm:p-6">
            <div className="hidden sm:block text-base font-semibold mb-3">Summary</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 sm:gap-4">
              {hasStandard ? (
                <>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-[11px] text-muted-foreground">Inserted</div>
                    <div className="font-semibold text-xs sm:text-lg">{inserted ?? "—"}</div>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-[11px] text-muted-foreground">Updated</div>
                    <div className="font-semibold text-xs sm:text-lg">{updated ?? "—"}</div>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-[11px] text-muted-foreground">Skipped</div>
                    <div className="font-semibold text-xs sm:text-lg">{skipped ?? "—"}</div>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-[11px] text-muted-foreground">Failed</div>
                    <div className="font-semibold text-xs sm:text-lg">{failed ?? "—"}</div>
                  </div>
                </>
              ) : (
                dynamicSummaryEntries.map(([key, value]) => (
                  <div key={key} className="min-w-0 overflow-hidden">
                    <div className="text-[11px] text-muted-foreground truncate">
                      {titleCaseWords(camelToHuman(key))}
                    </div>
                    <div className="font-semibold text-xs sm:text-lg truncate">
                      {typeof value === "boolean"
                        ? String(value)
                        : value == null
                          ? "—"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardContent className="px-3 py-3 sm:p-6 space-y-2 sm:space-y-3">
            <div className="hidden sm:block text-base font-semibold">Items</div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={itemsStatusFilter}
                onValueChange={(v) => {
                  setItemsStatusFilter(v);
                  setItemsPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm sm:h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">success</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                  <SelectItem value="skipped">skipped</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={itemsActionFilter}
                onValueChange={(v) => {
                  setItemsActionFilter(v);
                  setItemsPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm sm:h-9">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="inserted">inserted</SelectItem>
                  <SelectItem value="updated">updated</SelectItem>
                  <SelectItem value="skipped">skipped</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-auto border rounded-md -mx-3 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Entity</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Reason</TableHead>
                    <TableHead className="hidden md:table-cell text-xs">Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const m = (item.meta ?? {}) as Record<string, unknown>;
                    const name =
                      typeof m["name"] === "string" ? m["name"] : item.itemKey;
                    const reason =
                      typeof m["reason"] === "string"
                        ? (m["reason"] as string)
                        : "—";
                    const changes = formatChanges(m["changes"]);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="py-2 font-medium max-w-[120px] sm:max-w-[320px] truncate text-xs">
                          {name ?? "—"}
                        </TableCell>
                        <TableCell className="py-2 whitespace-nowrap">
                          <StatusBadge status={getActionLabel(item)} />
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                          {reason}
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell text-muted-foreground text-xs max-w-[280px] truncate">
                          {changes}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!items.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-xs sm:text-sm text-muted-foreground py-6"
                      >
                        {runItemsQuery.isLoading
                          ? "Loading…"
                          : "No items for this run."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {itemsPagination && itemsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
                <span>
                  {itemsPagination.page}/{itemsPagination.totalPages} ({itemsPagination.totalItems})
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    disabled={itemsPage <= 1}
                    onClick={() => setItemsPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    disabled={itemsPage >= itemsPagination.totalPages}
                    onClick={() => setItemsPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {run.status === "failed" && (
          <Card className="border-destructive/30">
            <CardContent className="px-3 py-3 sm:p-6 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Error</div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-xs"
                  onClick={async () => {
                    const text = [run.errorMessage ?? "", run.errorStack ?? ""]
                      .filter(Boolean)
                      .join("\n\n");
                    try {
                      await navigator.clipboard.writeText(text);
                      toast.success("Copied error");
                    } catch {
                      toast.error("Failed to copy");
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
              <pre className="text-xs whitespace-pre-wrap break-words min-w-0">
                {run.errorMessage ?? "—"}
              </pre>
              {run.errorStack ? (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">
                    Stack trace
                  </summary>
                  <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-md bg-muted p-2 overflow-auto max-h-40">
                    {run.errorStack}
                  </pre>
                </details>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
