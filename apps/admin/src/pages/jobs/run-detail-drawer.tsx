import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/table/status-badge";
import { batchesService } from "@/services/batches.service";
import { toast } from "sonner";
import type { AdminJobRunsListResponse } from "@repo/types";
import {
  formatDateTime,
  formatDurationMs,
  jobNameFromKey,
  getRunReason,
} from "./jobs.utils";

type RunRow = AdminJobRunsListResponse["data"][0];

interface RunDetailDrawerProps {
  run: RunRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RunMetaDetails({
  jobKey: _jobKey,
  meta,
}: {
  jobKey: string;
  meta: Record<string, unknown>;
}) {
  const window = meta["window"] as
    | { from?: string; to?: string }
    | undefined;
  const fetched =
    typeof meta["fetched"] === "number"
      ? meta["fetched"]
      : typeof meta["countFetched"] === "number"
        ? meta["countFetched"]
        : null;
  const daysAhead =
    typeof meta["daysAhead"] === "number" ? meta["daysAhead"] : null;

  const rows: Array<{ label: string; value: string }> = [];

  if (window?.from && window?.to) {
    rows.push({
      label: "Window",
      value: `${window.from} → ${window.to}${daysAhead != null ? ` (${daysAhead}d)` : ""}`,
    });
  } else if (daysAhead != null) {
    rows.push({ label: "Days ahead", value: String(daysAhead) });
  }

  if (typeof meta["filters"] === "string") {
    rows.push({ label: "Filters", value: meta["filters"] as string });
  }

  if (typeof meta["maxLiveAgeHours"] === "number") {
    rows.push({
      label: "Max live age",
      value: `${meta["maxLiveAgeHours"]}h`,
    });
  }

  if (typeof meta["candidates"] === "number") {
    rows.push({ label: "Candidates", value: String(meta["candidates"]) });
  }

  if (fetched != null) {
    rows.push({
      label: "Fetched from provider",
      value: fetched.toLocaleString(),
    });
  }

  if (typeof meta["countScheduled"] === "number") {
    rows.push({
      label: "Scheduled (NS)",
      value: String(meta["countScheduled"]),
    });
  }

  if (typeof meta["deleted"] === "number") {
    rows.push({ label: "Deleted sessions", value: String(meta["deleted"]) });
  }

  if (typeof meta["reason"] === "string") {
    rows.push({ label: "Reason", value: meta["reason"] as string });
  }

  if (!rows.length) return null;

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">Job Details</div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-mono text-foreground text-right truncate max-w-[60%]">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RunDetailDrawer({ run, open, onOpenChange }: RunDetailDrawerProps) {
  const [inspectBatchOpen, setInspectBatchOpen] = useState(false);
  const [batchPage, setBatchPage] = useState(1);

  const runMeta = useMemo(
    () => (run?.meta ?? {}) as Record<string, unknown>,
    [run]
  );

  const batchId = useMemo((): number | null => {
    const v = runMeta["batchId"];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    return null;
  }, [runMeta]);

  const batchItemsQuery = useQuery({
    queryKey: ["batch-items", batchId, batchPage],
    queryFn: () => batchesService.getBatchItems(batchId!, batchPage, 100),
    enabled: inspectBatchOpen && batchId !== null,
    staleTime: 15000,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setInspectBatchOpen(false);
      }}
    >
      <SheetContent
        hideClose
        side="right"
        className="sm:max-w-xl p-0 flex flex-col h-full min-h-0"
      >
        {run ? (
          <>
            <div className="p-6 pb-4">
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="truncate">
                      {jobNameFromKey(run.jobKey)}
                    </SheetTitle>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Run{" "}
                      <span className="font-mono text-foreground">
                        #{run.id}
                      </span>{" "}
                      • Job{" "}
                      <span className="font-mono text-foreground">
                        {run.jobKey}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={run.status} />
                    {run.status === "success" && getRunReason(runMeta) && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                        {getRunReason(runMeta)}
                      </span>
                    )}
                  </div>
                </div>

                {run.job?.description ? (
                  <SheetDescription className="mt-2">
                    {run.job.description}
                  </SheetDescription>
                ) : null}
              </SheetHeader>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="text-muted-foreground">
                  Started
                  <div className="text-foreground">
                    {formatDateTime(run.startedAt)}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Finished
                  <div className="text-foreground">
                    {formatDateTime(run.finishedAt)}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Duration
                  <div className="text-foreground">
                    {formatDurationMs(run.durationMs)}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Trigger
                  <div className="text-foreground font-mono">
                    {run.trigger}
                    {run.triggeredBy ? ` • ${run.triggeredBy}` : ""}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {runMeta["dryRun"] === true && (
              <div className="flex-shrink-0 mx-6 mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
                DRY RUN — no data was written
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-4">
              <RunMetaDetails jobKey={run.jobKey} meta={runMeta} />
              {(() => {
                const ok =
                  typeof runMeta["ok"] === "number"
                    ? (runMeta["ok"] as number)
                    : 0;
                const fail =
                  typeof runMeta["fail"] === "number"
                    ? (runMeta["fail"] as number)
                    : 0;
                const total =
                  typeof runMeta["total"] === "number"
                    ? (runMeta["total"] as number)
                    : 0;

                const inserted =
                  typeof runMeta["inserted"] === "number"
                    ? (runMeta["inserted"] as number)
                    : null;
                const updated =
                  typeof runMeta["updated"] === "number"
                    ? (runMeta["updated"] as number)
                    : null;
                const skipped =
                  typeof runMeta["skipped"] === "number"
                    ? (runMeta["skipped"] as number)
                    : null;
                const duplicates =
                  typeof runMeta["duplicates"] === "number"
                    ? (runMeta["duplicates"] as number)
                    : null;

                const hasWriteStats =
                  inserted !== null ||
                  updated !== null ||
                  skipped !== null ||
                  duplicates !== null;

                const batchIdLabel = batchId !== null ? String(batchId) : "—";

                return (
                  <>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium">Result</div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                        <div className="text-muted-foreground">
                          OK
                          <div className="text-foreground font-medium">
                            {ok}
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          Fail
                          <div className="text-foreground font-medium">
                            {fail}
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          Total
                          <div className="text-foreground font-medium">
                            {total}
                          </div>
                        </div>
                      </div>

                      {hasWriteStats ? (
                        <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                          <div className="text-muted-foreground">
                            Inserted
                            <div className="text-foreground font-medium">
                              {inserted ?? "—"}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            Updated
                            <div className="text-foreground font-medium">
                              {updated ?? "—"}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            Skipped
                            <div className="text-foreground font-medium">
                              {skipped ?? "—"}
                            </div>
                          </div>
                          <div className="text-muted-foreground">
                            Duplicates
                            <div className="text-foreground font-medium">
                              {duplicates ?? "—"}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div>
                          batchId:{" "}
                          <span className="font-mono text-foreground">
                            {batchIdLabel}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={batchId === null}
                          onClick={() => {
                            setInspectBatchOpen((v) => !v);
                            setBatchPage(1);
                          }}
                        >
                          {inspectBatchOpen ? "Hide items" : "Inspect items"}
                        </Button>
                      </div>
                    </div>

                    {inspectBatchOpen && batchId !== null ? (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium">
                          Batch items
                        </div>
                        {batchItemsQuery.isLoading ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Loading…
                          </div>
                        ) : batchItemsQuery.isError ? (
                          <div className="mt-2 text-xs text-destructive">
                            Failed to load batch items
                          </div>
                        ) : (
                          (() => {
                            const items = batchItemsQuery.data?.data ?? [];
                            const insertedItems = items.filter((it) => {
                              const m = (it.meta ?? {}) as Record<
                                string,
                                unknown
                              >;
                              return m["action"] === "insert";
                            });
                            const updatedItems = items.filter((it) => {
                              const m = (it.meta ?? {}) as Record<
                                string,
                                unknown
                              >;
                              return m["action"] === "update";
                            });
                            const successItems = items.filter(
                              (it) => it.status === "success"
                            );
                            const failedItems = items.filter(
                              (it) => it.status === "failed"
                            );
                            const skippedItems = items.filter(
                              (it) => it.status === "skipped"
                            );

                            const hasActionLabels =
                              insertedItems.length > 0 ||
                              updatedItems.length > 0;

                            const renderList = (
                              title: string,
                              list: typeof items
                            ) => (
                              <div className="mt-3">
                                <div className="text-xs font-medium">
                                  {title} ({list.length})
                                </div>
                                {list.length ? (
                                  <div className="mt-2 space-y-1">
                                    {list.slice(0, 20).map((it) => {
                                      const m = (it.meta ?? {}) as Record<
                                        string,
                                        unknown
                                      >;
                                      const name =
                                        typeof m["name"] === "string"
                                          ? m["name"]
                                          : null;
                                      return (
                                        <div
                                          key={it.id}
                                          className="text-xs text-muted-foreground flex items-start justify-between gap-3"
                                        >
                                          <span className="font-mono text-foreground">
                                            {it.itemKey ?? "—"}
                                          </span>
                                          <span className="truncate">
                                            {name ?? ""}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    —
                                  </div>
                                )}
                              </div>
                            );

                            return (
                              <>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {hasActionLabels ? (
                                    <>
                                      Showing items labeled as{" "}
                                      <span className="font-mono text-foreground">
                                        insert/update
                                      </span>
                                      .
                                    </>
                                  ) : (
                                    <>
                                      This batch doesn't include{" "}
                                      <span className="font-mono text-foreground">
                                        action
                                      </span>{" "}
                                      labels yet — showing status-based items
                                      instead.
                                    </>
                                  )}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  total:{" "}
                                  <span className="font-mono text-foreground">
                                    {items.length}
                                  </span>
                                  {" • "}success:{" "}
                                  <span className="font-mono text-foreground">
                                    {successItems.length}
                                  </span>
                                  {" • "}failed:{" "}
                                  <span className="font-mono text-foreground">
                                    {failedItems.length}
                                  </span>
                                  {" • "}skipped:{" "}
                                  <span className="font-mono text-foreground">
                                    {skippedItems.length}
                                  </span>
                                </div>

                                {hasActionLabels ? (
                                  <>
                                    {renderList("Inserted", insertedItems)}
                                    {renderList("Updated", updatedItems)}
                                  </>
                                ) : (
                                  <>
                                    {renderList("Success", successItems)}
                                    {renderList("Failed", failedItems)}
                                    {renderList("Skipped", skippedItems)}
                                  </>
                                )}
                              </>
                            );
                          })()
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            Page {batchPage}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={batchPage <= 1}
                              onClick={() => setBatchPage((p) => p - 1)}
                            >
                              Prev
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={
                                (batchItemsQuery.data?.data ?? []).length < 100
                              }
                              onClick={() => setBatchPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()}

              {run.status === "failed" && (
                <div className="rounded-lg border border-destructive/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium">Error</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const text = [
                          run.errorMessage ?? "",
                          run.errorStack ?? "",
                        ]
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
                  <div className="mt-2 text-xs text-foreground">
                    {run.errorMessage ?? "—"}
                  </div>
                  {run.errorStack ? (
                    <details className="mt-3 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        Stack trace
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">
                        {run.errorStack}
                      </pre>
                    </details>
                  ) : null}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Run</SheetTitle>
              <SheetDescription>
                Select a run to view details.
              </SheetDescription>
            </SheetHeader>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
