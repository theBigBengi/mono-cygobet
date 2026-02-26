import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { formatDistanceToNow, format } from "date-fns";
import { RotateCcw, ChevronDown, ChevronRight } from "lucide-react";

import { useAuditLogs, useAuditLogFilterOptions } from "@/hooks/use-audit-log";
import type { AdminAuditLogEntry } from "@repo/types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/table";
import { PageFilters } from "@/components/filters/page-filters";
import { DateRangePicker } from "@/components/filters/date-range-picker";

// ─── Category badge colors ───

const CATEGORY_COLORS: Record<string, string> = {
  jobs: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  sync: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  fixtures: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  settings: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  users: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  sandbox: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  alerts: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  auth: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.auth;
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${color}`}
    >
      {category}
    </span>
  );
}

function StatusCodeBadge({ code }: { code: number }) {
  const color =
    code >= 200 && code < 300
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : code >= 400
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${color}`}
    >
      {code}
    </span>
  );
}

// ─── Filters type ───

type Filters = {
  search: string;
  category: string;
  action: string;
  actorId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
};

const defaultFilters: Filters = {
  search: "",
  category: "",
  action: "",
  actorId: "",
  dateFrom: undefined,
  dateTo: undefined,
};

// ─── Changes display ───

function ChangesDisplay({
  changes,
}: {
  changes: Record<string, { old: unknown; new: unknown }>;
}) {
  return (
    <div className="space-y-1">
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="text-xs">
          <span className="font-medium text-muted-foreground">{field}:</span>{" "}
          <span className="text-red-600 dark:text-red-400 line-through">
            {JSON.stringify(oldVal)}
          </span>{" "}
          <span className="text-green-600 dark:text-green-400">
            {JSON.stringify(newVal)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MetadataDisplay({ metadata }: { metadata: Record<string, unknown> }) {
  return (
    <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto max-w-full">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}

// ─── Expandable row details ───

function RowDetails({ row }: { row: AdminAuditLogEntry }) {
  const hasChanges = row.changes && Object.keys(row.changes).length > 0;
  const hasMetadata = row.metadata && Object.keys(row.metadata).length > 0;

  if (!hasChanges && !hasMetadata) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No additional details
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasChanges && (
        <div>
          <p className="text-xs font-medium mb-1">Changes</p>
          <ChangesDisplay changes={row.changes!} />
        </div>
      )}
      {hasMetadata && (
        <div>
          <p className="text-xs font-medium mb-1">Metadata</p>
          <MetadataDisplay metadata={row.metadata!} />
        </div>
      )}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Method: {row.method}</span>
        <span>Path: {row.path}</span>
        {row.ipAddress && <span>IP: {row.ipAddress}</span>}
        {row.autoCapture && <Badge variant="outline" className="text-[10px] h-4">auto</Badge>}
      </div>
    </div>
  );
}

// ─── Page component ───

export default function ActivityLogPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const queryFilters = useMemo(
    () => ({
      search: appliedFilters.search || undefined,
      category: appliedFilters.category || undefined,
      action: appliedFilters.action || undefined,
      actorId: appliedFilters.actorId
        ? parseInt(appliedFilters.actorId, 10)
        : undefined,
      dateFrom: appliedFilters.dateFrom?.toISOString(),
      dateTo: appliedFilters.dateTo?.toISOString(),
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
    }),
    [appliedFilters, pagination]
  );

  const { data: logsData, isLoading, isFetching } = useAuditLogs(queryFilters);
  const { data: filterOptionsData } = useAuditLogFilterOptions();

  const filterOptions = filterOptionsData?.data;
  const logs = logsData?.data ?? [];
  const totalItems = logsData?.pagination?.totalItems ?? 0;

  const filtersAreDirty = useMemo(() => {
    return (
      filters.search !== appliedFilters.search ||
      filters.category !== appliedFilters.category ||
      filters.action !== appliedFilters.action ||
      filters.actorId !== appliedFilters.actorId ||
      filters.dateFrom?.getTime() !== appliedFilters.dateFrom?.getTime() ||
      filters.dateTo?.getTime() !== appliedFilters.dateTo?.getTime()
    );
  }, [filters, appliedFilters]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setExpandedRows(new Set());
  }, []);

  const toggleRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Table columns ───

  const columns = useMemo<ColumnDef<AdminAuditLogEntry>[]>(
    () => [
      {
        id: "expand",
        size: 32,
        cell: ({ row }) => {
          const expanded = expandedRows.has(row.original.id);
          return (
            <button
              onClick={() => toggleRow(row.original.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Time",
        size: 120,
        cell: ({ row }) => {
          const iso = row.original.createdAt;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs whitespace-nowrap cursor-default">
                    {formatDistanceToNow(new Date(iso), { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">{format(new Date(iso), "PPpp")}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "actorEmail",
        header: "Actor",
        size: 160,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {row.original.actorName ?? row.original.actorEmail.split("@")[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {row.original.actorEmail}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        size: 200,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <CategoryBadge category={row.original.category} />
            <span className="text-sm truncate">{row.original.action}</span>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {row.original.description}
          </span>
        ),
      },
      {
        id: "target",
        header: "Target",
        size: 120,
        cell: ({ row }) =>
          row.original.targetType ? (
            <span className="text-xs text-muted-foreground font-mono">
              {row.original.targetType}:{row.original.targetId}
            </span>
          ) : null,
      },
      {
        accessorKey: "statusCode",
        header: "Status",
        size: 60,
        cell: ({ row }) => (
          <StatusCodeBadge code={row.original.statusCode} />
        ),
      },
    ],
    [expandedRows, toggleRow]
  );

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
    state: { pagination },
    onPaginationChange: (updater) => {
      setPagination((old) =>
        typeof updater === "function" ? updater(old) : updater
      );
    },
  });

  // ─── Render ───

  const hasAppliedFilters =
    appliedFilters.search ||
    appliedFilters.category ||
    appliedFilters.action ||
    appliedFilters.actorId ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo;

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6 gap-3 sm:gap-4">
      {/* Filters */}
      <div className="flex-shrink-0 flex items-end gap-2">
      {/* Mobile: search input next to filter button */}
      <div className="flex sm:hidden flex-1 min-w-0">
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          className="h-10 w-full"
        />
      </div>
      <div className="sm:flex-1 min-w-0">
      <PageFilters
        showSubmit
        onSubmit={applyFilters}
        submitDisabled={!filtersAreDirty}
      >
        {/* Desktop: search inside filter row */}
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
          className="h-10 w-full sm:max-w-[200px] hidden sm:block"
        />
        <Select
          value={filters.category || "__all__"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, category: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-10 w-full sm:w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {(filterOptions?.categories ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.action || "__all__"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, action: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-10 w-full sm:w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actions</SelectItem>
            {(filterOptions?.actions ?? []).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.actorId || "__all__"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, actorId: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-10 w-full sm:w-[160px]">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actors</SelectItem>
            {(filterOptions?.actors ?? []).map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name ?? a.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker
          dateRange={
            filters.dateFrom || filters.dateTo
              ? { from: filters.dateFrom, to: filters.dateTo }
              : undefined
          }
          onDateRangeChange={(range) =>
            setFilters((f) => ({
              ...f,
              dateFrom: range?.from,
              dateTo: range?.to,
            }))
          }
          className="w-full sm:max-w-[260px]"
        />
      </PageFilters>
      </div>
      {hasAppliedFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="hidden sm:flex h-10 shrink-0">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="border rounded-md overflow-auto flex-1 min-h-0">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No activity log entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <>
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {expandedRows.has(row.original.id) && (
                        <TableRow key={`${row.id}-details`}>
                          <TableCell
                            colSpan={columns.length}
                            className="bg-muted/30 p-4"
                          >
                            <RowDetails row={row.original} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <TablePagination
          table={table}
          pagination={pagination}
          onPaginationChange={setPagination}
          dataLength={logs.length}
          serverTotalItems={totalItems}
        />
      </div>

      {/* Mobile card view */}
      <div className="flex sm:hidden flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No activity log entries found
          </p>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className="border rounded-lg p-3 space-y-2"
              onClick={() => toggleRow(entry.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CategoryBadge category={entry.category} />
                    <span className="text-sm font-medium truncate">
                      {entry.action}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {entry.description}
                  </p>
                </div>
                <StatusCodeBadge code={entry.statusCode} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{entry.actorName ?? entry.actorEmail}</span>
                <span>
                  {formatDistanceToNow(new Date(entry.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {expandedRows.has(entry.id) && (
                <div className="pt-2 border-t">
                  <RowDetails row={entry} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Mobile pagination */}
        <div className="flex-shrink-0 flex items-center justify-between text-sm pt-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {totalItems} total
            </span>
            {hasAppliedFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.pageIndex === 0}
              onClick={() =>
                setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))
              }
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                (pagination.pageIndex + 1) * pagination.pageSize >= totalItems
              }
              onClick={() =>
                setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Loading indicator for refetches */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-md px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          Loading...
        </div>
      )}
    </div>
  );
}
