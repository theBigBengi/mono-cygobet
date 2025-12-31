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
  ImageCell,
  DataTableColumnHeader,
} from "@/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  UnifiedLeague,
  AdminLeaguesListResponse,
  AdminProviderLeaguesResponse,
} from "@repo/types";

type LeagueDBRow = AdminLeaguesListResponse["data"][0];

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

interface LeaguesTableProps {
  mode: "db" | "provider";
  // For diff mode
  unifiedData?: UnifiedLeague[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  // For db mode
  dbData?: AdminLeaguesListResponse;
  // For provider mode
  providerData?: AdminProviderLeaguesResponse;
  isLoading?: boolean;
  error?: Error | null;
  // Sync handler (not implemented yet for leagues)
  onSyncLeague?: (externalId: string) => Promise<void>;
}

export function LeaguesTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncLeague,
}: LeaguesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedLeague, setSelectedLeague] = useState<UnifiedLeague | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (league: UnifiedLeague | LeagueDBRow) => {
    if (mode === "provider") {
      setSelectedLeague(league as UnifiedLeague);
    } else {
      // For DB mode, find the unified league from unifiedData
      const unifiedLeague = unifiedData.find(
        (l) => l.externalId === league.externalId
      );
      setSelectedLeague(unifiedLeague || null);
    }
    setIsDialogOpen(true);
  };

  // Filter unified data for provider mode (shows diff)
  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing") {
      filtered = filtered.filter((l) => l.status === "missing-in-db");
    } else if (diffFilter === "mismatch") {
      filtered = filtered.filter((l) => l.status === "mismatch");
    } else if (diffFilter === "extra") {
      filtered = filtered.filter((l) => l.status === "extra-in-db");
    } else if (diffFilter === "ok") {
      filtered = filtered.filter((l) => l.status === "ok");
    }
    return filtered;
  }, [unifiedData, diffFilter, mode]);

  // Define columns based on mode
  const columns = useMemo(() => {
    if (mode === "provider") {
      return [
        {
          accessorKey: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status" />
          ),
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const status = row.getValue("status") as UnifiedLeague["status"];
            const statusConfig: Record<
              UnifiedLeague["status"],
              {
                label: string;
                variant: "destructive" | "secondary" | "default";
              }
            > = {
              "missing-in-db": { label: "Missing", variant: "destructive" },
              mismatch: { label: "Mismatch", variant: "destructive" },
              "extra-in-db": { label: "Extra", variant: "secondary" },
              ok: { label: "OK", variant: "default" },
              new: { label: "New", variant: "secondary" },
            };
            const config = statusConfig[status] || statusConfig.ok;
            return (
              <span className="text-xs text-muted-foreground">
                {config.label}
              </span>
            );
          },
        },
        {
          accessorKey: "externalId",
          header: "externalId",
          cell: ({ row }: { row: Row<UnifiedLeague> }) => (
            <span className="font-mono text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {league.dbData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "name-provider",
          header: "Name (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {league.providerData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "type-db",
          header: "Type (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {league.dbData?.type || "—"}
              </span>
            );
          },
        },
        {
          id: "type-provider",
          header: "Type (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {league.providerData?.type || "—"}
              </span>
            );
          },
        },
        {
          id: "country",
          header: "Country",
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            const country = league.country;
            if (!country)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{country.name}</span>;
          },
        },
        {
          id: "country-in-db",
          header: "Country in DB",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            const countryInDb = league.countryInDb ?? false;
            if (!league.country) {
              return <span className="text-muted-foreground">—</span>;
            }
            return (
              <div className="flex items-center justify-center">
                {countryInDb ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            );
          },
        },
        {
          id: "image",
          header: "Image",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedLeague> }) => {
            const league = row.original;
            return <ImageCell imagePath={league.imagePath} />;
          },
        },
      ];
    } else if (mode === "db") {
      return [
        {
          accessorKey: "externalId",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="externalId" />
          ),
          cell: ({ row }: { row: Row<LeagueDBRow> }) => (
            <span className="font-mono text-[10px] sm:text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Name" />
          ),
          cell: ({ row }: { row: Row<LeagueDBRow> }) => (
            <span className="font-medium text-xs sm:text-sm">
              {row.getValue("name")}
            </span>
          ),
        },
        {
          accessorKey: "type",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Type" />
          ),
          cell: ({ row }: { row: Row<LeagueDBRow> }) => (
            <span className="text-xs sm:text-sm">
              {row.getValue("type") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "shortCode",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Short Code" />
          ),
          cell: ({ row }: { row: Row<LeagueDBRow> }) => (
            <span className="font-mono text-xs sm:text-sm">
              {row.getValue("shortCode") || "—"}
            </span>
          ),
        },
        {
          id: "country",
          header: "Country",
          enableSorting: false,
          cell: ({ row }: { row: Row<LeagueDBRow> }) => {
            const league = row.original;
            const country = league.country;
            if (!country)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{country.name}</span>;
          },
        },
        {
          accessorKey: "imagePath",
          header: "Image",
          enableSorting: false,
          cell: ({ row }: { row: Row<LeagueDBRow> }) => {
            const imagePath = row.getValue("imagePath") as string | null;
            return <ImageCell imagePath={imagePath} />;
          },
        },
        {
          accessorKey: "updatedAt",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Updated At" />
          ),
          cell: ({ row }: { row: Row<LeagueDBRow> }) => {
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

  const table = useReactTable({
    data: tableData as (UnifiedLeague | LeagueDBRow)[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as any, // Columns are dynamically typed based on mode
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
        const league = row.original as unknown as UnifiedLeague;
        return (
          league.externalId.toLowerCase().includes(search) ||
          league.name.toLowerCase().includes(search) ||
          league.dbData?.name?.toLowerCase().includes(search) ||
          league.providerData?.name?.toLowerCase().includes(search) ||
          league.type?.toLowerCase().includes(search) ||
          league.country?.name.toLowerCase().includes(search) ||
          false
        );
      } else {
        // DB mode
        const league = row.original as LeagueDBRow;
        return (
          league.name.toLowerCase().includes(search) ||
          league.externalId.toLowerCase().includes(search) ||
          league.type?.toLowerCase().includes(search) ||
          league.country?.name.toLowerCase().includes(search) ||
          false
        );
      }
    },
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onPaginationChange: setPagination,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
  });

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
        searchPlaceholder="Search leagues..."
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
                  const league = row.original as UnifiedLeague | LeagueDBRow;

                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(league)}
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
                    className="h-24 text-center"
                  >
                    {tableData.length === 0
                      ? `No leagues found (tableData is empty, mode: ${mode})`
                      : `No rows after filtering/pagination (tableData: ${tableData.length}, rows: ${rows?.length || 0})`}
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
              {selectedLeague ? `Sync ${selectedLeague.name}` : "Sync League"}
            </DialogTitle>
            <DialogDescription>
              {selectedLeague && (
                <>
                  External ID:{" "}
                  <span className="font-mono">{selectedLeague.externalId}</span>
                  <br />
                  Status:{" "}
                  <span className="capitalize">
                    {selectedLeague.status.replace("-", " ")}
                  </span>
                  {selectedLeague.country && (
                    <>
                      <br />
                      Country: {selectedLeague.country.name}
                      {selectedLeague.countryInDb === false && (
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
          {selectedLeague && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name (DB)</p>
                  <p className="font-medium">
                    {selectedLeague.dbData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name (Provider)</p>
                  <p className="font-medium">
                    {selectedLeague.providerData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-mono">{selectedLeague.type || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Short Code</p>
                  <p className="font-mono">{selectedLeague.shortCode || "—"}</p>
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
                if (!selectedLeague || !onSyncLeague) return;
                const isSyncing = syncingIds.has(selectedLeague.externalId);
                const isDisabled = selectedLeague.countryInDb === false;
                if (isSyncing || isDisabled) return;

                setSyncingIds((prev) =>
                  new Set(prev).add(selectedLeague.externalId)
                );
                try {
                  await onSyncLeague(selectedLeague.externalId);
                  setIsDialogOpen(false);
                } catch (error) {
                  console.error("Sync failed:", error);
                } finally {
                  setSyncingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selectedLeague.externalId);
                    return next;
                  });
                }
              }}
              disabled={
                !selectedLeague ||
                !onSyncLeague ||
                syncingIds.has(selectedLeague.externalId) ||
                selectedLeague.countryInDb === false
              }
            >
              {syncingIds.has(selectedLeague?.externalId || "") ? (
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
