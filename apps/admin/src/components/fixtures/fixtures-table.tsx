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
import { Input } from "@/components/ui/input";
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
import { CloudSync, CheckCircle2, XCircle, Pencil } from "lucide-react";
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
import { useColumnVisibility } from "@/hooks/use-column-visibility";

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
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(
    "fixtures-table",
    {
      "name-db": false,
      "state-db": false,
    }
  );
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedFixture, setSelectedFixture] = useState<UnifiedFixture | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedState, setEditedState] = useState<string>("");

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
            return <StatusBadge status={status} className="text-xs" />;
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
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
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
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
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
                <span className="text-xs sm:text-sm whitespace-nowrap">
                  {format(date, "MMM dd, yyyy HH:mm")}
                </span>
              );
            } catch {
              return <span className="text-muted-foreground">—</span>;
            }
          },
        },
        {
          id: "state-db",
          header: "State (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            return (
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {fixture.dbData?.state || "—"}
              </span>
            );
          },
        },
        {
          id: "state-provider",
          header: "State (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedFixture> }) => {
            const fixture = row.original;
            return (
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {fixture.providerData?.state || "—"}
              </span>
            );
          },
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
            return (
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
                {leagueName}
              </span>
            );
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
            return (
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
                {countryName}
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
            column: Column<UnifiedFixture | FixtureDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => (
            <span className="font-mono text-[10px] sm:text-xs whitespace-nowrap">
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
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
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
                <span className="text-xs sm:text-sm whitespace-nowrap">
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
            <span className="text-xs sm:text-sm whitespace-nowrap">
              {row.getValue("state")}
            </span>
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
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
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
            return (
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
                {league.name}
              </span>
            );
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
            return (
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis block">
                {season.name}
              </span>
            );
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
              <div className="flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap">
                <span className="overflow-hidden text-ellipsis">
                  {homeTeam.name}
                </span>
                <span className="text-muted-foreground flex-shrink-0">vs</span>
                <span className="overflow-hidden text-ellipsis">
                  {awayTeam.name}
                </span>
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
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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
    setIsEditMode(false);
    setEditedState("");
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
          table={table}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          diffFilter={diffFilter}
          onDiffFilterChange={onDiffFilterChange}
          showDiffFilter={true}
        />
      )}
      {mode === "db" && (
        <TableControls
          table={table}
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
                      <TableCell
                        key={cell.id}
                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                      >
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
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setEditedState("");
          }
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="text-left flex-shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <DialogTitle className="text-base sm:text-lg">
                {selectedFixture?.name || "Fixture"}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 border"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (!isEditMode && selectedFixture) {
                    setEditedState(selectedFixture.state || "");
                  }
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {selectedFixture && (
            <div className="space-y-2 sm:space-y-4 flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-shrink-0">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    External ID
                  </label>
                  <Input
                    readOnly
                    value={String(selectedFixture.externalId)}
                    className="text-xs h-8 bg-muted font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Fixture Name
                  </label>
                  <Input
                    readOnly
                    value={selectedFixture.name || "—"}
                    className="text-xs h-8 bg-muted"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Start Date
                  </label>
                  <Input
                    readOnly
                    value={
                      selectedFixture.startIso
                        ? format(new Date(selectedFixture.startIso), "PPpp")
                        : "—"
                    }
                    className="text-xs h-8 bg-muted"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    State
                  </label>
                  {isEditMode ? (
                    <Select
                      value={editedState || selectedFixture.state || ""}
                      onValueChange={setEditedState}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NS">Not Started (NS)</SelectItem>
                        <SelectItem value="LIVE">Live (LIVE)</SelectItem>
                        <SelectItem value="FT">Full Time (FT)</SelectItem>
                        <SelectItem value="CAN">Cancelled (CAN)</SelectItem>
                        <SelectItem value="INT">Interrupted (INT)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      readOnly
                      value={selectedFixture.state || "—"}
                      className="text-xs h-8 bg-muted"
                    />
                  )}
                </div>
                {selectedFixture.result && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Result
                    </label>
                    <Input
                      readOnly
                      value={selectedFixture.result}
                      className="text-xs h-8 bg-muted"
                    />
                  </div>
                )}
                {selectedFixture.stageRoundName && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Stage/Round
                    </label>
                    <Input
                      readOnly
                      value={selectedFixture.stageRoundName}
                      className="text-xs h-8 bg-muted"
                    />
                  </div>
                )}
                {selectedFixture.league && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      League
                    </label>
                    <Input
                      readOnly
                      value={selectedFixture.league.name}
                      className="text-xs h-8 bg-muted"
                    />
                  </div>
                )}
                {selectedFixture.season && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Season
                    </label>
                    <Input
                      readOnly
                      value={selectedFixture.season.name}
                      className="text-xs h-8 bg-muted"
                    />
                  </div>
                )}
                {selectedFixture.homeTeam && selectedFixture.awayTeam && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Teams
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs sm:text-sm break-words">
                        {selectedFixture.homeTeam.name}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-xs sm:text-sm break-words">
                        {selectedFixture.awayTeam.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
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
