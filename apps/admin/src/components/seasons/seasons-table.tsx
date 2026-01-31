import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type Row,
  type Column,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CloudSync, CheckCircle2, XCircle } from "lucide-react";
import {
  TablePagination,
  TableControls,
  TableSkeleton,
  TableError,
  DataTableColumnHeader,
  StatusBadge,
} from "@/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UnifiedSeason } from "@/types";
import type {
  AdminSeasonsListResponse,
  AdminProviderSeasonsResponse,
} from "@repo/types";

type SeasonDBRow = AdminSeasonsListResponse["data"][0];

import type { DiffFilter } from "@/types";
import { useColumnVisibility } from "@/hooks/use-column-visibility";

interface SeasonsTableProps {
  mode: "db" | "provider";
  // For diff mode
  unifiedData?: UnifiedSeason[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  // For db mode
  dbData?: AdminSeasonsListResponse;
  // For provider mode
  providerData?: AdminProviderSeasonsResponse;
  isLoading?: boolean;
  error?: Error | null;
  // Sync handler
  onSyncSeason?: (externalId: string) => Promise<void>;
  // DB tab server pagination
  dbPagination?: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  onDbPageChange?: (page: number) => void;
  onDbPageSizeChange?: (size: number) => void;
}

export function SeasonsTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncSeason,
  dbPagination,
  onDbPageChange,
  onDbPageSizeChange,
}: SeasonsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(
    "seasons-table",
    {}
  );
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedSeason, setSelectedSeason] = useState<UnifiedSeason | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter unified data for provider mode (shows diff)
  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing") {
      filtered = filtered.filter((s) => s.status === "missing-in-db");
    } else if (diffFilter === "mismatch") {
      filtered = filtered.filter((s) => s.status === "mismatch");
    } else if (diffFilter === "extra") {
      filtered = filtered.filter((s) => s.status === "extra-in-db");
    } else if (diffFilter === "ok") {
      filtered = filtered.filter((s) => s.status === "ok");
    }
    return filtered;
  }, [unifiedData, diffFilter, mode]);

  // Define columns based on mode
  const columns = useMemo(() => {
    if (mode === "provider") {
      return [
        {
          accessorKey: "status",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const status = row.getValue("status") as UnifiedSeason["status"];
            return <StatusBadge status={status} className="text-xs" />;
          },
        },
        {
          accessorKey: "externalId",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => (
            <span className="font-mono text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const season = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {season.dbData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "name-provider",
          header: "Name (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const season = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {season.providerData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "league",
          header: "League",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const season = row.original;
            const league = season.league;
            if (!league)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{league.name}</span>;
          },
        },
        {
          id: "league-in-db",
          header: "League in DB",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const season = row.original;
            const leagueInDb = season.leagueInDb ?? false;
            if (!season.league) {
              return <span className="text-muted-foreground">—</span>;
            }
            return (
              <div className="flex items-center justify-center">
                {leagueInDb ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            );
          },
        },
        {
          id: "dates",
          header: "Dates",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const season = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {season.startDate && season.endDate
                  ? `${season.startDate} - ${season.endDate}`
                  : "—"}
              </span>
            );
          },
        },
        {
          id: "isCurrent",
          header: "Current",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedSeason> }) => {
            const season = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {season.isCurrent ? "Yes" : "No"}
              </span>
            );
          },
        },
      ];
    } else if (mode === "db") {
      return [
        {
          accessorKey: "externalId",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => (
            <span className="font-mono text-[10px] sm:text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => (
            <span className="font-medium text-xs sm:text-sm">
              {row.getValue("name")}
            </span>
          ),
        },
        {
          id: "league",
          header: "League",
          enableSorting: false,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => {
            const season = row.original;
            const league = season.league;
            if (!league)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{league.name}</span>;
          },
        },
        {
          accessorKey: "startDate",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Start Date" />,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => (
            <span className="text-xs sm:text-sm">
              {row.getValue("startDate") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "endDate",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="End Date" />,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => (
            <span className="text-xs sm:text-sm">
              {row.getValue("endDate") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "isCurrent",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Current" />,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => (
            <span className="text-xs sm:text-sm">
              {row.getValue("isCurrent") ? "Yes" : "No"}
            </span>
          ),
        },
        {
          accessorKey: "updatedAt",
          header: ({
            column,
          }: {
            column: Column<UnifiedSeason | SeasonDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Updated At" />,
          cell: ({ row }: { row: Row<SeasonDBRow> }) => {
            const updatedAt = row.getValue("updatedAt") as string | undefined;
            if (!updatedAt)
              return <span className="text-muted-foreground">—</span>;
            return (
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {new Date(updatedAt).toLocaleDateString()}
              </span>
            );
          },
        },
      ];
    } else {
      return [];
    }
  }, [mode]);

  // Get table data based on mode
  const tableData = useMemo(() => {
    if (mode === "provider") {
      return filteredDiffData;
    } else {
      // db mode
      return dbData?.data || [];
    }
  }, [mode, filteredDiffData, dbData]);

  // Show loading skeletons only on initial load (no data), not during background refetches
  const isModeLoading = useMemo(() => {
    if (mode === "db") {
      // Only show skeleton if loading AND no data (initial load)
      return isLoading && !dbData;
    } else {
      // Provider mode: only show skeleton if loading AND no data (initial load)
      return isLoading && unifiedData.length === 0;
    }
  }, [mode, isLoading, dbData, unifiedData]);

  const isDbServerPagination =
    mode === "db" && dbPagination != null && onDbPageChange != null;

  const table = useReactTable({
    data: tableData as (UnifiedSeason | SeasonDBRow)[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any, // Columns are dynamically typed based on mode
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(isDbServerPagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      if (mode === "provider") {
        // Provider mode shows unified diff data
        const season = row.original as unknown as UnifiedSeason;
        return (
          season.externalId.toLowerCase().includes(search) ||
          season.name.toLowerCase().includes(search) ||
          season.dbData?.name?.toLowerCase().includes(search) ||
          season.providerData?.name?.toLowerCase().includes(search) ||
          season.league?.name.toLowerCase().includes(search) ||
          false
        );
      } else {
        // DB mode
        const season = row.original as unknown as SeasonDBRow;
        return (
          season.externalId.toLowerCase().includes(search) ||
          season.name.toLowerCase().includes(search) ||
          season.league?.name.toLowerCase().includes(search) ||
          false
        );
      }
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      pagination:
        isDbServerPagination && dbPagination
          ? {
              pageIndex: dbPagination.page - 1,
              pageSize: dbPagination.perPage,
            }
          : pagination,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (isDbServerPagination && onDbPageChange) {
        const next =
          typeof updater === "function"
            ? updater({
                pageIndex: (dbPagination?.page ?? 1) - 1,
                pageSize: dbPagination?.perPage ?? 25,
              })
            : updater;
        onDbPageChange(next.pageIndex + 1);
        if (next.pageSize !== dbPagination?.perPage) {
          onDbPageSizeChange?.(next.pageSize);
        }
      } else {
        setPagination(updater);
      }
    },
    manualPagination: isDbServerPagination,
    pageCount: isDbServerPagination ? dbPagination?.totalPages : undefined,
  });

  const handleRowClick = (season: UnifiedSeason | SeasonDBRow) => {
    if (mode === "provider") {
      setSelectedSeason(season as UnifiedSeason);
    } else {
      // For DB mode, find the unified season from unifiedData
      const unifiedSeason = unifiedData.find(
        (s) => s.externalId === season.externalId
      );
      setSelectedSeason(unifiedSeason || null);
    }
    setIsDialogOpen(true);
  };

  if (isModeLoading) {
    return <TableSkeleton columnCount={columns.length} />;
  }

  if (error) {
    return <TableError error={error} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <TableControls
        table={table}
        searchPlaceholder="Search seasons..."
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        showDiffFilter={mode === "provider" && !!onDiffFilterChange}
        diffFilter={diffFilter}
        onDiffFilterChange={onDiffFilterChange}
      />

      {/* Table */}
      <div className="flex-1 min-h-0 border-t overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
            {(() => {
              const rows = table.getRowModel().rows;

              if (rows?.length) {
                return rows.map((row) => {
                  const season = row.original as UnifiedSeason | SeasonDBRow;

                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(season)}
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
                  );
                });
              }

              return (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    {table.getState().globalFilter
                      ? "No results match your filters"
                      : "No data synced yet — use the Sync Center to get started"}
                  </TableCell>
                </TableRow>
              );
            })()}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        table={table}
        pagination={
          isDbServerPagination && dbPagination
            ? {
                pageIndex: dbPagination.page - 1,
                pageSize: dbPagination.perPage,
              }
            : pagination
        }
        onPaginationChange={(next) => {
          if (isDbServerPagination && onDbPageChange) {
            onDbPageChange(next.pageIndex + 1);
            if (next.pageSize !== dbPagination?.perPage) {
              onDbPageSizeChange?.(next.pageSize);
            }
          } else {
            setPagination(next);
          }
        }}
        dataLength={tableData.length}
        serverTotalItems={
          isDbServerPagination ? dbPagination?.totalItems : undefined
        }
      />

      {/* Sync Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSeason ? `Sync ${selectedSeason.name}` : "Sync Season"}
            </DialogTitle>
            <DialogDescription>
              {selectedSeason && (
                <>
                  External ID:{" "}
                  <span className="font-mono">{selectedSeason.externalId}</span>
                  <br />
                  Status:{" "}
                  <span className="capitalize">
                    {selectedSeason.status.replace("-", " ")}
                  </span>
                  {selectedSeason.league && (
                    <>
                      <br />
                      League: {selectedSeason.league.name}
                      {selectedSeason.leagueInDb === false && (
                        <span className="text-destructive ml-2">
                          (Not in DB)
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSeason && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name (DB)</p>
                  <p className="font-medium">
                    {selectedSeason.dbData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name (Provider)</p>
                  <p className="font-medium">
                    {selectedSeason.providerData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-mono">{selectedSeason.startDate || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-mono">{selectedSeason.endDate || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Is Current</p>
                  <p className="font-mono">
                    {selectedSeason.isCurrent ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedSeason || !onSyncSeason) return;
                const isSyncing = syncingIds.has(selectedSeason.externalId);
                const isDisabled = selectedSeason.leagueInDb === false;
                if (isSyncing || isDisabled) return;

                setSyncingIds((prev) =>
                  new Set(prev).add(selectedSeason.externalId)
                );
                try {
                  await onSyncSeason(selectedSeason.externalId);
                  setIsDialogOpen(false);
                } catch (error) {
                  console.error("Sync failed:", error);
                } finally {
                  setSyncingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selectedSeason.externalId);
                    return next;
                  });
                }
              }}
              disabled={
                !selectedSeason ||
                !onSyncSeason ||
                syncingIds.has(selectedSeason.externalId) ||
                selectedSeason.leagueInDb === false
              }
            >
              {syncingIds.has(selectedSeason?.externalId || "") ? (
                <>
                  <CloudSync className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudSync className="mr-2 h-4 w-4" />
                  Sync
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
