import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  TablePagination,
  TableControls,
  TableSkeleton,
  TableError,
  DataTableColumnHeader,
  StatusBadge,
} from "@/components/table";
import type { UnifiedFixture } from "@/types";
import type {
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
} from "@repo/types";
import { format } from "date-fns";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { FixtureDialog } from "./fixture-dialog";

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
  // Update handler
  onUpdate?: () => void;
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

export function FixturesTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncFixture,
  onUpdate,
  dbPagination,
  onDbPageChange,
  onDbPageSizeChange,
}: FixturesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(
    "fixtures-table",
    {
      "name-db": false,
      "state-db": false,
      stage: false,
      round: false,
    }
  );
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const navigate = useNavigate();
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedFixture, setSelectedFixture] = useState<UnifiedFixture | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Update selectedFixture when unifiedData or dbData changes (after refresh)
  useEffect(() => {
    if (selectedFixture && isDialogOpen) {
      // Find the updated fixture in the data
      if (mode === "provider" && unifiedData) {
        const updatedFixture = unifiedData.find(
          (f) => f.externalId === selectedFixture.externalId
        );
        if (updatedFixture) {
          setSelectedFixture(updatedFixture);
        }
      } else if (mode === "db" && dbData?.data) {
        const updatedFixture = dbData.data.find(
          (f) => f.externalId === selectedFixture.externalId
        );
        if (updatedFixture) {
          // Convert to UnifiedFixture format (API has stage/round as separate fields)
          setSelectedFixture({
            externalId: updatedFixture.externalId,
            name: updatedFixture.name,
            startIso: updatedFixture.startIso,
            startTs: updatedFixture.startTs,
            state: updatedFixture.state,
            result: updatedFixture.result,
            stage: updatedFixture.stage ?? null,
            round: updatedFixture.round ?? null,
            source: "db",
            status: "ok",
            dbData: updatedFixture,
            league: updatedFixture.league,
            season: updatedFixture.season,
            homeTeam: updatedFixture.homeTeam,
            awayTeam: updatedFixture.awayTeam,
          });
        }
      }
    }
  }, [unifiedData, dbData, selectedFixture, isDialogOpen, mode]);

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
          id: "stage",
          accessorKey: "stage",
          header: "Stage",
          enableSorting: false,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const fixture = row.original as { stage?: string | null };
            return (
              <span className="text-xs">{fixture.stage || "—"}</span>
            );
          },
        },
        {
          id: "round",
          accessorKey: "round",
          header: "Round",
          enableSorting: false,
          cell: ({ row }: { row: Row<FixtureDBRow> }) => {
            const fixture = row.original as { round?: string | null };
            return (
              <span className="text-xs">{fixture.round || "—"}</span>
            );
          },
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

  const isDbServerPagination =
    mode === "db" && dbPagination != null && onDbPageChange != null;

  const table = useReactTable<UnifiedFixture | FixtureDBRow>({
    data: tableData,
    columns: columns as ColumnDef<UnifiedFixture | FixtureDBRow>[],
    state: {
      sorting,
      globalFilter,
      pagination:
        isDbServerPagination && dbPagination
          ? {
              pageIndex: dbPagination.page - 1,
              pageSize: dbPagination.perPage,
            }
          : pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isDbServerPagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
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
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
  });

  const handleRowClick = (fixture: UnifiedFixture | FixtureDBRow) => {
    if (mode === "provider") {
      // In provider mode, always open dialog (never navigate) so Provider/DB tabs and mismatch badges are visible
      setSelectedFixture(fixture as UnifiedFixture);
      setIsDialogOpen(true);
      return;
    }
    // DB mode: navigate to detail page when fixture has id
    const dbId = (fixture as FixtureDBRow).id;
    if (dbId != null && Number.isFinite(dbId)) {
      navigate(`/fixtures/${dbId}`);
      return;
    }
    // DB mode, no id: open dialog with converted UnifiedFixture
    const dbFixture = fixture as FixtureDBRow;
    setSelectedFixture({
      externalId: dbFixture.externalId,
      name: dbFixture.name,
      startIso: dbFixture.startIso,
      startTs: dbFixture.startTs,
      state: dbFixture.state,
      result: dbFixture.result,
      stage: dbFixture.stage ?? null,
      round: dbFixture.round ?? null,
      source: "db",
      status: "ok",
      dbData: dbFixture,
      league: dbFixture.league,
      season: dbFixture.season,
      homeTeam: dbFixture.homeTeam,
      awayTeam: dbFixture.awayTeam,
    });
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

      {/* Detail Dialog */}
      <FixtureDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        fixture={selectedFixture}
        mode={mode}
        onSyncFixture={handleSyncFixture}
        syncingIds={syncingIds}
        onUpdate={onUpdate}
      />
    </div>
  );
}
