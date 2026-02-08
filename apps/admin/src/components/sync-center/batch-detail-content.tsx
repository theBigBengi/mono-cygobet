"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/table/status-badge";
import type { Batch, BatchItem } from "@repo/types";
import { useBatchItems, useBatchFailedItems } from "@/hooks/use-batches";
import { cn } from "@/lib/utils";

const BATCH_LABELS: Record<string, string> = {
  "seed-season": "Seed Season",
  "seed-fixtures": "Sync Fixtures",
  "seed-countries": "Sync Countries",
  "seed-leagues": "Sync Leagues",
  "seed-seasons": "Sync Seasons",
  "seed-teams": "Sync Teams",
  "seed-bookmakers": "Sync Bookmakers",
};

function formatDuration(batch: Batch): string {
  const ms =
    batch.durationMs ??
    (batch.finishedAt
      ? new Date(batch.finishedAt).getTime() -
        new Date(batch.startedAt).getTime()
      : 0);
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

function TimeAgo({ date }: { date: string }) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  let text: string;
  if (diffMins < 60) {
    text = rtf.format(-diffMins, "minute");
  } else if (diffHours < 24) {
    text = rtf.format(-diffHours, "hour");
  } else {
    text = rtf.format(-diffDays, "day");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm text-muted-foreground cursor-help">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{new Date(date).toLocaleString()}</TooltipContent>
    </Tooltip>
  );
}

function BatchDetailHeader({ batch }: { batch: Batch }) {
  const label = BATCH_LABELS[batch.name] ?? batch.name;
  const isSuccess = batch.status === "success";
  const meta = batch.meta as {
    season?: { name?: string; league?: string };
  } | null;
  const context =
    meta?.season?.league && meta?.season?.name
      ? `${meta.season.league} · ${meta.season.name}`
      : (meta?.season?.name ?? null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
          )}
          <span className="font-semibold">{label}</span>
        </div>
        <TimeAgo date={batch.startedAt} />
      </div>
      {context && <p className="text-sm text-muted-foreground">{context}</p>}
    </div>
  );
}

function formatChanges(ch: unknown): string {
  if (ch == null || typeof ch !== "object") return "—";
  const obj = ch as Record<string, unknown>;
  const parts = Object.entries(obj).map(
    ([k, v]) => `${k}: ${String(v ?? "—")}`
  );
  return parts.length ? parts.join(", ") : "—";
}

function getActionLabel(item: BatchItem): string {
  const m = (item.meta ?? {}) as Record<string, unknown>;
  const action = m["action"];
  if (typeof action === "string") return action;
  if (item.status === "success") return "success";
  if (item.status === "skipped") return "skipped";
  if (item.status === "failed") return "failed";
  return item.status;
}

function SummaryCards({ batch }: { batch: Batch }) {
  const duration = formatDuration(batch);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardDescription>Duration</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-lg font-medium">{duration}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardDescription>Total</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-lg font-medium">{batch.itemsTotal}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardDescription>Success</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-lg font-medium text-green-600">
            {batch.itemsSuccess}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardDescription>Failed</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <p
            className={cn(
              "text-lg font-medium",
              batch.itemsFailed > 0
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {batch.itemsFailed}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

type StatusFilterValue = "all" | "success" | "failed" | "skipped";
type ActionFilterValue = "all" | "inserted" | "updated" | "skipped" | "failed";

function ItemsSection({ batch }: { batch: Batch }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilterValue>("all");

  const { data, isLoading } = useBatchItems(batch.id, {
    page,
    perPage: 50,
    status: statusFilter === "all" ? undefined : statusFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
  });

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilterValue);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px]">
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
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v as ActionFilterValue);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px]">
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
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead className="hidden lg:table-cell">Changes</TableHead>
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
                    <TableCell className="font-medium max-w-[200px] sm:max-w-[300px] truncate">
                      {name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={getActionLabel(item)} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                      {reason}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-[280px] truncate">
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
                    {isLoading ? "Loading…" : "No items for this batch."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {pagination.page}/{pagination.totalPages}
              <span className="hidden sm:inline">
                {" "}
                ({pagination.totalItems})
              </span>
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FailedItemsList({
  batchId,
  failedCount,
}: {
  batchId: number;
  failedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useBatchFailedItems(batchId, { enabled: open });
  const items = data?.data ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm">
          View {failedCount} failed item{failedCount !== 1 ? "s" : ""}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isLoading ? (
          <Skeleton className="mt-3 h-20 w-full" />
        ) : (
          <ul className="mt-3 space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
            {items.map((item: BatchItem) => (
              <li
                key={item.id}
                className="text-sm border-b border-muted/50 pb-2 last:border-0 last:pb-0"
              >
                <span className="font-mono text-muted-foreground">
                  {item.itemKey ?? `#${item.id}`}
                </span>
                {item.errorMessage && (
                  <p className="mt-0.5 text-destructive text-xs">
                    {item.errorMessage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ErrorSection({ batch }: { batch: Batch }) {
  const hasBatchError = batch.status === "failed" && batch.errorMessage;
  const hasItemFailures = batch.itemsFailed > 0;

  if (!hasBatchError && !hasItemFailures) return null;

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-destructive">Errors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasBatchError && (
          <p className="text-sm text-destructive">{batch.errorMessage}</p>
        )}
        {hasItemFailures && (
          <FailedItemsList batchId={batch.id} failedCount={batch.itemsFailed} />
        )}
      </CardContent>
    </Card>
  );
}

export interface BatchDetailContentProps {
  batch: Batch;
}

export function BatchDetailContent({ batch }: BatchDetailContentProps) {
  return (
    <div className="space-y-6">
      <BatchDetailHeader batch={batch} />
      <div>
        <h4 className="text-sm font-medium mb-3">Summary</h4>
        <SummaryCards batch={batch} />
      </div>
      <ItemsSection batch={batch} />
      <ErrorSection batch={batch} />
    </div>
  );
}
