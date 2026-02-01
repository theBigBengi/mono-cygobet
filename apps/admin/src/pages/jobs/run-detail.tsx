import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/table/status-badge";
import { useRun, useRunItems } from "@/hooks/use-jobs";
import {
  formatDateTime,
  formatDurationMs,
  jobNameFromKey,
  titleCaseWords,
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

  const meta = run.meta ?? {};
  const inserted =
    typeof meta["inserted"] === "number" ? meta["inserted"] : null;
  const updated = typeof meta["updated"] === "number" ? meta["updated"] : null;
  const skipped = typeof meta["skipped"] === "number" ? meta["skipped"] : null;
  const failed =
    typeof meta["fail"] === "number" ? meta["fail"] : null;

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
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {titleCaseWords(jobNameFromKey(run.jobKey))} — Run #{run.id}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {run.jobKey}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} />
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/jobs/${encodeURIComponent(jobKey)}`)
            }
          >
            Back to Job
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Run info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Started</div>
              <div className="font-medium">
                {formatDateTime(run.startedAt)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Finished</div>
              <div className="font-medium">
                {formatDateTime(run.finishedAt)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">
                {formatDurationMs(run.durationMs)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Trigger</div>
              <div className="font-medium font-mono">
                {run.trigger}
                {run.triggeredBy ? ` • ${run.triggeredBy}` : ""}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Inserted</div>
                <div className="font-medium text-lg">
                  {inserted ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Updated</div>
                <div className="font-medium text-lg">
                  {updated ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Skipped</div>
                <div className="font-medium text-lg">
                  {skipped ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Failed</div>
                <div className="font-medium text-lg">
                  {failed ?? "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={itemsStatusFilter}
                onValueChange={(v) => {
                  setItemsStatusFilter(v);
                  setItemsPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
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
                <SelectTrigger className="w-[140px]">
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
            <div className="overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Changes</TableHead>
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
                        <TableCell className="font-medium max-w-[320px] truncate">
                          {name ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={getActionLabel(item)} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                          {reason}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[280px] truncate">
                          {changes}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!items.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-sm text-muted-foreground py-8"
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
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {itemsPagination.page} of {itemsPagination.totalPages} (
                  {itemsPagination.totalItems} items)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={itemsPage <= 1}
                    onClick={() => setItemsPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
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

        {run.status === "failed" && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <pre className="text-sm whitespace-pre-wrap break-words flex-1 min-w-0">
                  {run.errorMessage ?? "—"}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
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
              {run.errorStack ? (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    Stack trace
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs overflow-auto max-h-48">
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
