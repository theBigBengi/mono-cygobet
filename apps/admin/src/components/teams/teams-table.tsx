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
  UnifiedTeam,
  AdminTeamsListResponse,
  AdminProviderTeamsResponse,
} from "@repo/types";

type TeamDBRow = AdminTeamsListResponse["data"][0];

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

interface TeamsTableProps {
  mode: "db" | "provider";
  // For diff mode
  unifiedData?: UnifiedTeam[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  // For db mode
  dbData?: AdminTeamsListResponse;
  // For provider mode
  providerData?: AdminProviderTeamsResponse;
  isLoading?: boolean;
  error?: Error | null;
  // Sync handler
  onSyncTeam?: (externalId: string) => Promise<void>;
}

export function TeamsTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncTeam,
}: TeamsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedTeam, setSelectedTeam] = useState<UnifiedTeam | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter unified data for provider mode (shows diff)
  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing") {
      filtered = filtered.filter((t) => t.status === "missing-in-db");
    } else if (diffFilter === "mismatch") {
      filtered = filtered.filter((t) => t.status === "mismatch");
    } else if (diffFilter === "extra") {
      filtered = filtered.filter((t) => t.status === "extra-in-db");
    } else if (diffFilter === "ok") {
      filtered = filtered.filter((t) => t.status === "ok");
    }
    return filtered;
  }, [unifiedData, diffFilter, mode]);

  // Define columns based on mode
  const columns = useMemo(() => {
    if (mode === "provider") {
      return [
        {
          accessorKey: "status",
          header: "Status",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const status = row.getValue("status") as UnifiedTeam["status"];
            const statusConfig: Record<
              UnifiedTeam["status"],
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
          cell: ({ row }: { row: Row<UnifiedTeam> }) => (
            <span className="font-mono text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {team.dbData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "name-provider",
          header: "Name (Provider)",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {team.providerData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "type-db",
          header: "Type (DB)",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {team.dbData?.type || "—"}
              </span>
            );
          },
        },
        {
          id: "type-provider",
          header: "Type (Provider)",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {team.providerData?.type || "—"}
              </span>
            );
          },
        },
        {
          id: "country",
          header: "Country",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            const country = team.country;
            if (!country)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{country.name}</span>;
          },
        },
        {
          id: "league-in-db",
          header: "League in DB",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            const leagueInDb = team.leagueInDb ?? false;
            if (!team.country) {
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
          id: "image",
          header: "Image",
          cell: ({ row }: { row: Row<UnifiedTeam> }) => {
            const team = row.original;
            return <ImageCell imagePath={team.imagePath} />;
          },
        },
      ];
    } else if (mode === "db") {
      return [
        {
          accessorKey: "externalId",
          header: "externalId",
          cell: ({ row }: { row: Row<TeamDBRow> }) => (
            <span className="font-mono text-[10px] sm:text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: "Name",
          cell: ({ row }: { row: Row<TeamDBRow> }) => (
            <span className="font-medium text-xs sm:text-sm">
              {row.getValue("name")}
            </span>
          ),
        },
        {
          accessorKey: "type",
          header: "Type",
          cell: ({ row }: { row: Row<TeamDBRow> }) => (
            <span className="text-xs sm:text-sm">
              {row.getValue("type") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "shortCode",
          header: "Short Code",
          cell: ({ row }: { row: Row<TeamDBRow> }) => (
            <span className="font-mono text-xs sm:text-sm">
              {row.getValue("shortCode") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "founded",
          header: "Founded",
          cell: ({ row }: { row: Row<TeamDBRow> }) => {
            const founded = row.getValue("founded") as number | null;
            return (
              <span className="text-xs sm:text-sm">
                {founded ? founded.toString() : "—"}
              </span>
            );
          },
        },
        {
          id: "country",
          header: "Country",
          cell: ({ row }: { row: Row<TeamDBRow> }) => {
            const team = row.original;
            const country = team.country;
            if (!country)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{country.name}</span>;
          },
        },
        {
          accessorKey: "imagePath",
          header: "Image",
          cell: ({ row }: { row: Row<TeamDBRow> }) => {
            const imagePath = row.getValue("imagePath") as string | null;
            return <ImageCell imagePath={imagePath} />;
          },
        },
        {
          accessorKey: "updatedAt",
          header: "Updated At",
          cell: ({ row }: { row: Row<TeamDBRow> }) => {
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
    data: tableData as (UnifiedTeam | TeamDBRow)[],
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
        const team = row.original as unknown as UnifiedTeam;
        return (
          team.externalId.toLowerCase().includes(search) ||
          team.name.toLowerCase().includes(search) ||
          team.dbData?.name?.toLowerCase().includes(search) ||
          team.providerData?.name?.toLowerCase().includes(search) ||
          team.type?.toLowerCase().includes(search) ||
          team.country?.name.toLowerCase().includes(search) ||
          false
        );
      } else {
        // DB mode
        const team = row.original as unknown as TeamDBRow;
        return (
          team.externalId.toLowerCase().includes(search) ||
          team.name.toLowerCase().includes(search) ||
          team.type?.toLowerCase().includes(search) ||
          team.shortCode?.toLowerCase().includes(search) ||
          team.country?.name.toLowerCase().includes(search) ||
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
    manualPagination: false,
  });

  const handleSyncTeam = async (externalId: string) => {
    if (!onSyncTeam) return;
    setSyncingIds((prev) => new Set(prev).add(externalId));
    try {
      await onSyncTeam(externalId);
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(externalId);
        return next;
      });
    }
  };

  const handleRowClick = (team: UnifiedTeam | TeamDBRow) => {
    if (mode === "provider") {
      setSelectedTeam(team as UnifiedTeam);
    } else {
      // For DB mode, we can still show the team in dialog
      const unifiedTeam = unifiedData.find(
        (t) => t.externalId === team.externalId
      );
      setSelectedTeam(unifiedTeam || null);
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
        searchPlaceholder="Search teams..."
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
                  const team = row.original as UnifiedTeam | TeamDBRow;
                  const isClickable = mode === "provider" && onSyncTeam;
                  const canSync =
                    mode === "provider" &&
                    onSyncTeam &&
                    (team as UnifiedTeam).leagueInDb !== false;

                  return (
                    <TableRow
                      key={row.id}
                      className={
                        isClickable ? "cursor-pointer hover:bg-muted/50" : ""
                      }
                      onClick={() => {
                        if (mode === "provider" || mode === "db") {
                          setSelectedTeam(team as UnifiedTeam);
                          setIsDialogOpen(true);
                        }
                      }}
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
                      ? `No teams found (tableData is empty, mode: ${mode})`
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
              {selectedTeam ? `Sync ${selectedTeam.name}` : "Sync Team"}
            </DialogTitle>
            <DialogDescription>
                  {selectedTeam && (
                <>
                  External ID:{" "}
                  <span className="font-mono">{selectedTeam.externalId}</span>
                  <br />
                  Status:{" "}
                  <span className="capitalize">
                    {selectedTeam.status.replace("-", " ")}
                  </span>
                  {selectedTeam.country && (
                    <>
                      <br />
                      Country: {selectedTeam.country.name}
                      {selectedTeam.leagueInDb === false && (
                        <span className="text-destructive ml-2">
                          (No league in DB)
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name (DB)</p>
                  <p className="font-medium">
                    {selectedTeam.dbData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name (Provider)</p>
                  <p className="font-medium">
                    {selectedTeam.providerData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-mono">{selectedTeam.type || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Short Code</p>
                  <p className="font-mono">{selectedTeam.shortCode || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Founded</p>
                  <p className="font-mono">{selectedTeam.founded || "—"}</p>
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
                if (!selectedTeam || !onSyncTeam) return;
                const isSyncing = syncingIds.has(selectedTeam.externalId);
                const isDisabled = selectedTeam.leagueInDb === false;
                if (isSyncing || isDisabled) return;

                setSyncingIds((prev) =>
                  new Set(prev).add(selectedTeam.externalId)
                );
                try {
                  await onSyncTeam(selectedTeam.externalId);
                  setIsDialogOpen(false);
                } catch (error) {
                  console.error("Sync failed:", error);
                } finally {
                  setSyncingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selectedTeam.externalId);
                    return next;
                  });
                }
              }}
              disabled={
                !selectedTeam ||
                !onSyncTeam ||
                syncingIds.has(selectedTeam.externalId) ||
                selectedTeam.leagueInDb === false
              }
            >
              {syncingIds.has(selectedTeam?.externalId || "") ? (
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

