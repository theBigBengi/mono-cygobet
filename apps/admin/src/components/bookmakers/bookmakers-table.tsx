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
  type ColumnDef,
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
import { CloudSync } from "lucide-react";
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
import type { UnifiedBookmaker } from "@/types";
import type {
  AdminBookmakersListResponse,
  AdminProviderBookmakersResponse,
} from "@repo/types";

type BookmakerDBRow = AdminBookmakersListResponse["data"][0];

import type { DiffFilter } from "@/types";
import { useColumnVisibility } from "@/hooks/use-column-visibility";

interface BookmakersTableProps {
  mode: "db" | "provider";
  // For diff mode
  unifiedData?: UnifiedBookmaker[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  // For db mode
  dbData?: AdminBookmakersListResponse;
  // For provider mode
  providerData?: AdminProviderBookmakersResponse;
  isLoading?: boolean;
  error?: Error | null;
  // Sync handler
  onSyncBookmaker?: (externalId: string) => Promise<void>;
}

export function BookmakersTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncBookmaker,
}: BookmakersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(
    "bookmakers-table",
    {}
  );
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedBookmaker, setSelectedBookmaker] =
    useState<UnifiedBookmaker | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (bookmaker: UnifiedBookmaker | BookmakerDBRow) => {
    const unifiedBookmaker = unifiedData.find(
      (b) =>
        b.externalId === (bookmaker as BookmakerDBRow).externalId ||
        b.externalId === String((bookmaker as UnifiedBookmaker).externalId)
    );
    setSelectedBookmaker(unifiedBookmaker || (bookmaker as UnifiedBookmaker));
    setIsDialogOpen(true);
  };

  // Filter unified data for provider mode (shows diff)
  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing") {
      filtered = filtered.filter((b) => b.status === "missing-in-db");
    } else if (diffFilter === "mismatch") {
      filtered = filtered.filter((b) => b.status === "mismatch");
    } else if (diffFilter === "extra") {
      filtered = filtered.filter((b) => b.status === "extra-in-db");
    } else if (diffFilter === "ok") {
      filtered = filtered.filter((b) => b.status === "ok");
    }
    return filtered;
  }, [unifiedData, diffFilter, mode]);

  // Define columns based on mode
  const columns = useMemo(() => {
    if (mode === "provider") {
      return [
        {
          id: "status",
          accessorFn: (row: UnifiedBookmaker | BookmakerDBRow) => {
            const bookmaker = row as UnifiedBookmaker;
            return bookmaker.status;
          },
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => {
            const bookmaker = row.original as UnifiedBookmaker;
            const status = bookmaker.status;
            return <StatusBadge status={status} className="text-xs" />;
          },
        },
        {
          accessorKey: "externalId",
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => (
            <span className="text-xs sm:text-sm font-mono">
              {(row.getValue("externalId") as string) || "—"}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => (
            <span className="text-xs sm:text-sm">{row.getValue("name")}</span>
          ),
        },
      ];
    } else {
      // DB mode
      return [
        {
          accessorKey: "id",
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="ID" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => {
            const bookmaker = row.original as BookmakerDBRow;
            return (
              <span className="text-xs sm:text-sm font-mono">
                {bookmaker.id}
              </span>
            );
          },
        },
        {
          accessorKey: "externalId",
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => (
            <span className="text-xs sm:text-sm font-mono">
              {(row.getValue("externalId") as string) || "—"}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => (
            <span className="text-xs sm:text-sm">{row.getValue("name")}</span>
          ),
        },
        {
          accessorKey: "updatedAt",
          header: ({
            column,
          }: {
            column: Column<UnifiedBookmaker | BookmakerDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Updated" />,
          cell: ({ row }: { row: Row<UnifiedBookmaker | BookmakerDBRow> }) => {
            const updatedAt = row.getValue("updatedAt") as string;
            return (
              <span className="text-xs text-muted-foreground">
                {updatedAt ? new Date(updatedAt).toLocaleDateString() : "—"}
              </span>
            );
          },
        },
      ];
    }
  }, [mode]);

  // Determine data source
  const tableData = useMemo(() => {
    if (mode === "provider") {
      return filteredDiffData;
    } else {
      return dbData?.data || [];
    }
  }, [mode, filteredDiffData, dbData]);

  const table = useReactTable<UnifiedBookmaker | BookmakerDBRow>({
    data: tableData as (UnifiedBookmaker | BookmakerDBRow)[],
    columns: columns as ColumnDef<UnifiedBookmaker | BookmakerDBRow>[],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      if (mode === "provider") {
        // Provider mode shows unified diff data
        const bookmaker = row.original as unknown as UnifiedBookmaker;
        return (
          bookmaker.externalId.toLowerCase().includes(search) ||
          bookmaker.name.toLowerCase().includes(search) ||
          bookmaker.dbData?.name?.toLowerCase().includes(search) ||
          bookmaker.providerData?.name?.toLowerCase().includes(search) ||
          false
        );
      } else {
        // DB mode
        const bookmaker = row.original as BookmakerDBRow;
        return (
          bookmaker.name.toLowerCase().includes(search) ||
          bookmaker.externalId?.toLowerCase().includes(search) ||
          false
        );
      }
    },
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      pagination,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
  });

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
        searchPlaceholder="Search bookmakers..."
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
                  const bookmaker = row.original as
                    | UnifiedBookmaker
                    | BookmakerDBRow;

                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(bookmaker)}
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
        pagination={pagination}
        onPaginationChange={setPagination}
        dataLength={tableData.length}
      />

      {/* Sync Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedBookmaker
                ? `Sync ${selectedBookmaker.name}`
                : "Sync Bookmaker"}
            </DialogTitle>
            <DialogDescription>
              {selectedBookmaker && (
                <>
                  External ID:{" "}
                  <span className="font-mono">
                    {selectedBookmaker.externalId}
                  </span>
                  <br />
                  Status:{" "}
                  <span className="capitalize">
                    {selectedBookmaker.status.replace("-", " ")}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedBookmaker && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name (DB)</p>
                  <p className="font-medium">
                    {selectedBookmaker.dbData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name (Provider)</p>
                  <p className="font-medium">
                    {selectedBookmaker.providerData?.name || "—"}
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
                if (!selectedBookmaker || !onSyncBookmaker) return;
                const isSyncing = syncingIds.has(selectedBookmaker.externalId);
                if (isSyncing) return;

                setSyncingIds((prev) =>
                  new Set(prev).add(selectedBookmaker.externalId)
                );
                try {
                  await onSyncBookmaker(selectedBookmaker.externalId);
                  setIsDialogOpen(false);
                } catch (error) {
                  console.error("Sync failed:", error);
                } finally {
                  setSyncingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selectedBookmaker.externalId);
                    return next;
                  });
                }
              }}
              disabled={
                !selectedBookmaker ||
                !onSyncBookmaker ||
                syncingIds.has(selectedBookmaker.externalId)
              }
            >
              {syncingIds.has(selectedBookmaker?.externalId || "") ? (
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
