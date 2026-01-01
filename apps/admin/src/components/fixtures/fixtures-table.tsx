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
  type ColumnDef,
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
} from "@/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UnifiedFixture } from "@/types";
import type {
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
} from "@repo/types";
import { format } from "date-fns";

type FixtureDBRow = AdminFixturesListResponse["data"][0];

import type { DiffFilter } from "@/types";

interface FixturesTableProps {
  mode: "db" | "provider";
  // For diff mode
  unifiedData?: UnifiedFixture[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  // For db mode
  dbData?: AdminFixturesListResponse;
  // For provider mode
  providerData?: AdminProviderFixturesResponse;
  isLoading?: boolean;
  error?: Error | null;
  // Sync handler
  onSyncFixture?: (externalId: string) => Promise<void>;
}

export function FixturesTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncFixture,
}: FixturesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedFixture, setSelectedFixture] = useState<UnifiedFixture | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter unified data for provider mode (shows diff)
  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing") {
      filtered = filtered.filter((f) => f.status === "missing-in-db");
    } else if (diffFilter === "mismatch") {
      filtered = filtered.filter((f) => f.status === "mismatch");
    } else if (diffFilter === "extra") {
      filtered = filtered.filter((f) => f.status === "extra-in-db");
    } else if (diffFilter === "ok") {
      filtered = filtered.filter((f) => f.status === "ok");
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
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const status = row.getValue("status") as UnifiedFixture["status"];
            const statusConfig: Record<
              UnifiedFixture["status"],
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
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => (
            <span className="font-mono text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {fixture.dbData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "name-provider",
          header: "Name (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {fixture.providerData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "start-date",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Start Date" />,
          accessorFn: (row: UnifiedFixture) => {
            const startIso = row.startIso;
            if (!startIso) return null;
            try {
              return new Date(startIso).getTime();
            } catch {
              return null;
            }
          },
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            const startIso = fixture.startIso;
            if (!startIso)
              return <span className="text-muted-foreground">—</span>;
            try {
              const date = new Date(startIso);
              return (
                <span className="text-xs sm:text-sm">
                  {format(date, "MMM dd, yyyy HH:mm")}
                </span>
              );
            } catch {
              return <span className="text-muted-foreground">—</span>;
            }
          },
        },
        {
          id: "state",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="State" />,
          accessorFn: (row: UnifiedFixture) => row.state,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => (
            <span className="text-xs sm:text-sm">{row.original.state}</span>
          ),
        },
        {
          id: "league-in-db",
          header: "League in DB",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            const leagueInDb = fixture.leagueInDb ?? false;
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
          id: "season-in-db",
          header: "Season in DB",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            const seasonInDb = fixture.seasonInDb ?? false;
            return (
              <div className="flex items-center justify-center">
                {seasonInDb ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            );
          },
        },
        {
          id: "has-odds",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Has Odds" />,
          accessorFn: (row: UnifiedFixture) => row.hasOdds ?? false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            const hasOdds = fixture.hasOdds ?? false;
            return (
              <div className="flex items-center justify-center">
                {hasOdds ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            );
          },
        },
        {
          id: "league-name",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="League" />,
          accessorFn: (row: UnifiedFixture) => row.leagueName ?? "",
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            const leagueName = fixture.leagueName;
            if (!leagueName)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{leagueName}</span>;
          },
        },
        {
          id: "country-name",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Country" />,
          accessorFn: (row: UnifiedFixture) => row.countryName ?? "",
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            const countryName = fixture.countryName;
            if (!countryName)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{countryName}</span>;
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
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => (
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
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => (
            <span className="font-medium text-xs sm:text-sm">
              {row.getValue("name")}
            </span>
          ),
        },
        {
          id: "start-date",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Start Date" />,
          accessorFn: (row: FixtureDBRow) => {
            const startIso = row.startIso;
            if (!startIso) return null;
            try {
              return new Date(startIso).getTime();
            } catch {
              return null;
            }
          },
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const startIso = row.original.startIso;
            if (!startIso)
              return <span className="text-muted-foreground">—</span>;
            try {
              const date = new Date(startIso);
              return (
                <span className="text-xs sm:text-sm">
                  {format(date, "MMM dd, yyyy HH:mm")}
                </span>
              );
            } catch {
              return <span className="text-muted-foreground">—</span>;
            }
          },
        },
        {
          accessorKey: "state",
          header: ({
            column,
          }: {
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="State" />,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => (
            <span className="text-xs sm:text-sm">{row.getValue("state")}</span>
          ),
        },
        {
          id: "result",
          header: "Result",
          enableSorting: false,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const fixture = row.original;
            if (fixture.homeScore !== null && fixture.awayScore !== null) {
              return (
                <span className="text-xs sm:text-sm font-medium">
                  {fixture.homeScore} - {fixture.awayScore}
                </span>
              );
            }
            return <span className="text-muted-foreground">—</span>;
          },
        },
        {
          id: "league",
          header: "League",
          enableSorting: false,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const fixture = row.original;
            const league = fixture.league;
            if (!league)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{league.name}</span>;
          },
        },
        {
          id: "season",
          header: "Season",
          enableSorting: false,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const fixture = row.original;
            const season = fixture.season;
            if (!season)
              return <span className="text-muted-foreground">—</span>;
            return <span className="text-xs sm:text-sm">{season.name}</span>;
          },
        },
        {
          id: "teams",
          header: "Teams",
          enableSorting: false,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const fixture = row.original;
            const homeTeam = fixture.homeTeam;
            const awayTeam = fixture.awayTeam;
            if (!homeTeam || !awayTeam) {
              return <span className="text-muted-foreground">—</span>;
            }
            return (
              <div className="flex items-center gap-1 text-xs sm:text-sm">
                <span>{homeTeam.name}</span>
                <span className="text-muted-foreground">vs</span>
                <span>{awayTeam.name}</span>
              </div>
            );
          },
        },
      ];
    }
    return [];
  }, [mode]);

  // Get data based on mode
  const tableData = useMemo(() => {
    if (mode === "provider") {
      return filteredDiffData;
    } else if (mode === "db") {
      return dbData?.data || [];
    }
    return [];
  }, [mode, filteredDiffData, dbData]);

  const table = useReactTable<UnifiedFixture | FixtureDBRow>({
    data: tableData,
    columns: columns as ColumnDef<UnifiedFixture | FixtureDBRow>[],
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
  });

  const handleRowClick = (fixture: UnifiedFixture | FixtureDBRow) => {
    if (mode === "provider") {
      setSelectedFixture(fixture as UnifiedFixture);
    } else {
      // For DB mode, convert to UnifiedFixture format
      const dbFixture = fixture as FixtureDBRow;
      setSelectedFixture({
        externalId: dbFixture.externalId,
        name: dbFixture.name,
        startIso: dbFixture.startIso,
        startTs: dbFixture.startTs,
        state: dbFixture.state,
        result: dbFixture.result,
        stageRoundName: dbFixture.stageRoundName,
        source: "db",
        status: "ok",
        dbData: dbFixture,
        league: dbFixture.league,
        season: dbFixture.season,
        homeTeam: dbFixture.homeTeam,
        awayTeam: dbFixture.awayTeam,
      } as UnifiedFixture);
    }
    setIsDialogOpen(true);
  };

  const handleSyncFixture = async (externalId: string) => {
    if (!onSyncFixture) return;
    setSyncingIds((prev) => new Set(prev).add(externalId));
    try {
      await onSyncFixture(externalId);
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(externalId);
        return next;
      });
    }
  };

  if (isLoading) {
    return <TableSkeleton columnCount={columns.length} />;
  }

  if (error) {
    return <TableError error={error.message} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      {mode === "provider" && onDiffFilterChange && (
        <TableControls
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          diffFilter={diffFilter}
          onDiffFilterChange={onDiffFilterChange}
        />
      )}
      {mode === "db" && (
        <TableControls
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
        />
      )}

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
                  const fixture = row.original;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(fixture)}
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
                    No fixtures found.
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

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fixture Details</DialogTitle>
            <DialogDescription>
              {selectedFixture?.name || "Fixture information"}
            </DialogDescription>
          </DialogHeader>

          {selectedFixture && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    External ID
                  </label>
                  <p className="text-sm font-mono">
                    {selectedFixture.externalId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <p className="text-sm">{selectedFixture.status || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Start Date
                  </label>
                  <p className="text-sm">
                    {selectedFixture.startIso
                      ? format(new Date(selectedFixture.startIso), "PPpp")
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    State
                  </label>
                  <p className="text-sm">{selectedFixture.state || "—"}</p>
                </div>
                {selectedFixture.result && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Result
                    </label>
                    <p className="text-sm">{selectedFixture.result}</p>
                  </div>
                )}
                {selectedFixture.stageRoundName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Stage/Round
                    </label>
                    <p className="text-sm">{selectedFixture.stageRoundName}</p>
                  </div>
                )}
              </div>

              {selectedFixture.league && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    League
                  </label>
                  <p className="text-sm">{selectedFixture.league.name}</p>
                </div>
              )}

              {selectedFixture.season && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Season
                  </label>
                  <p className="text-sm">{selectedFixture.season.name}</p>
                </div>
              )}

              {selectedFixture.homeTeam && selectedFixture.awayTeam && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Teams
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">
                      {selectedFixture.homeTeam.name}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-sm">
                      {selectedFixture.awayTeam.name}
                    </span>
                  </div>
                </div>
              )}

              {mode === "provider" && selectedFixture.providerData && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Provider Data</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        League in DB:{" "}
                      </span>
                      <span>
                        {selectedFixture.leagueInDb ? (
                          <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="inline h-3 w-3 text-red-500" />
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Season in DB:{" "}
                      </span>
                      <span>
                        {selectedFixture.seasonInDb ? (
                          <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="inline h-3 w-3 text-red-500" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedFixture.dbData && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Database Data</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedFixture.dbData.homeScore !== null &&
                      selectedFixture.dbData.awayScore !== null && (
                        <div>
                          <span className="text-muted-foreground">Score: </span>
                          <span>
                            {selectedFixture.dbData.homeScore} -{" "}
                            {selectedFixture.dbData.awayScore}
                          </span>
                        </div>
                      )}
                    <div>
                      <span className="text-muted-foreground">Created: </span>
                      <span>
                        {format(
                          new Date(selectedFixture.dbData.createdAt),
                          "PPpp"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated: </span>
                      <span>
                        {format(
                          new Date(selectedFixture.dbData.updatedAt),
                          "PPpp"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {mode === "provider" &&
              selectedFixture &&
              selectedFixture.status === "missing-in-db" && (
                <Button
                  onClick={() => {
                    if (selectedFixture) {
                      handleSyncFixture(selectedFixture.externalId);
                    }
                    setIsDialogOpen(false);
                  }}
                  disabled={syncingIds.has(selectedFixture.externalId)}
                >
                  {syncingIds.has(selectedFixture.externalId) ? (
                    <>
                      <CloudSync className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <CloudSync className="mr-2 h-4 w-4" />
                      Sync Fixture
                    </>
                  )}
                </Button>
              )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
