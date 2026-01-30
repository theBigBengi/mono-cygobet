import { useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TablePagination,
  TableControls,
  TableSkeleton,
  TableError,
  DataTableColumnHeader,
  StatusBadge,
} from "@/components/table";
import type { UnifiedOdds, DiffFilter } from "@/types";
import type {
  AdminOddsListResponse,
  AdminProviderOddsResponse,
} from "@repo/types";
import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { useColumnVisibility } from "@/hooks/use-column-visibility";

type OddsDBRow = AdminOddsListResponse["data"][0];

// Grouped odds by fixture + market (for provider mode)
interface GroupedOdds {
  fixtureExternalId: string;
  fixtureName: string | null;
  marketExternalId: string;
  marketName: string | null;
  status: UnifiedOdds["status"];
  startingAtTs: number;
  odds: UnifiedOdds[]; // All odds for this fixture+market combination
  oddsCount: number;
}

interface OddsTableProps {
  mode: "db" | "provider";
  unifiedData?: UnifiedOdds[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  dbData?: AdminOddsListResponse;
  providerData?: AdminProviderOddsResponse;
  isLoading?: boolean;
  error?: Error | null;
}

export function OddsTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
}: OddsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(
    "odds-table",
    {}
  );
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [selectedGroupedOdd, setSelectedGroupedOdd] =
    useState<GroupedOdds | null>(null);
  const [selectedOdd, setSelectedOdd] = useState<
    UnifiedOdds | OddsDBRow | null
  >(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing")
      filtered = filtered.filter((o) => o.status === "missing-in-db");
    else if (diffFilter === "mismatch")
      filtered = filtered.filter((o) => o.status === "mismatch");
    else if (diffFilter === "extra")
      filtered = filtered.filter((o) => o.status === "extra-in-db");
    else if (diffFilter === "ok")
      filtered = filtered.filter((o) => o.status === "ok");
    return filtered;
  }, [unifiedData, diffFilter, mode]);

  // Group odds by fixture + market for provider mode
  const groupedProviderData = useMemo(() => {
    if (mode !== "provider") return [];

    const groupedMap = new Map<string, GroupedOdds>();

    filteredDiffData.forEach((odd) => {
      const key = `${odd.fixtureExternalId}-${odd.marketExternalId}`;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          fixtureExternalId: odd.fixtureExternalId,
          fixtureName:
            odd.providerData?.fixtureName || odd.dbData?.fixtureName || null,
          marketExternalId: odd.marketExternalId,
          marketName: odd.marketName,
          status: odd.status,
          startingAtTs: odd.startingAtTs,
          odds: [],
          oddsCount: 0,
        });
      }

      const group = groupedMap.get(key)!;
      group.odds.push(odd);
      group.oddsCount = group.odds.length;

      // Update status to worst status (mismatch > missing > extra > ok)
      if (odd.status === "mismatch") {
        group.status = "mismatch";
      } else if (
        odd.status === "missing-in-db" &&
        group.status !== "mismatch"
      ) {
        group.status = "missing-in-db";
      } else if (odd.status === "extra-in-db" && group.status === "ok") {
        group.status = "extra-in-db";
      }
    });

    return Array.from(groupedMap.values()).sort(
      (a, b) => b.startingAtTs - a.startingAtTs
    );
  }, [filteredDiffData, mode]);

  const columns = useMemo(() => {
    // Helper function to format timestamp as readable string
    const formatStartAt = (ts: number): string => {
      if (!ts) return "—";
      const date = new Date(ts * 1000);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Provider mode columns (grouped by fixture + market, but showing same columns as before)
    if (mode === "provider") {
      return [
        {
          accessorKey: "status",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="Status" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => (
            <StatusBadge
              status={
                row.getValue("status") as
                  | "ok"
                  | "missing-in-db"
                  | "extra-in-db"
                  | "mismatch"
                  | "new"
              }
              className="text-xs"
            />
          ),
        },
        {
          accessorKey: "marketName",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="Market Name" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => (
            <span className="text-xs sm:text-sm">
              {(row.getValue("marketName") as string) || "—"}
            </span>
          ),
        },
        {
          accessorKey: "externalId",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="External ID" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => {
            // Show first odd's external ID or count
            const group = row.original;
            return (
              <span className="text-xs sm:text-sm font-mono">
                {group.odds[0]?.externalId || "—"}
              </span>
            );
          },
        },
        {
          accessorKey: "fixtureName",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="Fixture Name" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => (
            <span className="text-xs sm:text-sm">
              {(row.getValue("fixtureName") as string) || "—"}
            </span>
          ),
        },
        {
          accessorKey: "bookmakerName",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="Bookmaker" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => {
            // Show first odd's bookmaker or multiple
            const group = row.original;
            const bookmakers = new Set(
              group.odds.map((o) => o.bookmakerName).filter(Boolean)
            );
            if (bookmakers.size === 0)
              return <span className="text-xs sm:text-sm">—</span>;
            if (bookmakers.size === 1) {
              return (
                <span className="text-xs sm:text-sm">
                  {Array.from(bookmakers)[0]}
                </span>
              );
            }
            return (
              <span className="text-xs sm:text-sm">
                {Array.from(bookmakers).slice(0, 2).join(", ")}
                {bookmakers.size > 2 && ` +${bookmakers.size - 2}`}
              </span>
            );
          },
        },
        {
          id: "value",
          header: "Value",
          enableSorting: false,
          cell: ({ row }: { row: Row<GroupedOdds> }) => {
            const firstOdd = row.original.odds?.[0];
            return (
              <span className="text-xs font-mono">{firstOdd?.value ?? "—"}</span>
            );
          },
        },
        {
          accessorKey: "winning",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="Settled" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => {
            // Show icon: checkmark if any are settled, X if none
            const group = row.original;
            const hasSettled = group.odds.some((o) => o.winning);
            return (
              <div className="flex items-center justify-center">
                {hasSettled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            );
          },
        },
        {
          accessorKey: "startingAtTs",
          header: ({ column }: { column: Column<GroupedOdds, unknown> }) => (
            <DataTableColumnHeader column={column} title="Start At" />
          ),
          cell: ({ row }: { row: Row<GroupedOdds> }) => {
            const ts = row.getValue("startingAtTs") as number;
            return (
              <span className="text-xs sm:text-sm">{formatStartAt(ts)}</span>
            );
          },
        },
      ];
    }

    // DB mode columns (individual odds)
    const dbColumns = [
      {
        accessorKey: "status",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: () => <StatusBadge status="ok" className="text-xs" />,
      },
      {
        accessorKey: "marketName",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Market Name" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <span className="text-xs sm:text-sm">
            {(row.getValue("marketName") as string) || "—"}
          </span>
        ),
      },
      {
        accessorKey: "externalId",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="External ID" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <span className="text-xs sm:text-sm font-mono">
            {row.getValue("externalId") as string}
          </span>
        ),
      },
      {
        accessorKey: "fixtureExternalId",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Fixture External ID" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <span className="text-xs sm:text-sm font-mono">
            {row.getValue("fixtureExternalId") as string}
          </span>
        ),
      },
      {
        accessorKey: "fixtureName",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Fixture Name" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <span className="text-xs sm:text-sm">
            {(row.getValue("fixtureName") as string) || "—"}
          </span>
        ),
      },
      {
        accessorKey: "bookmakerName",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Bookmaker" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <span className="text-xs sm:text-sm">
            {(row.getValue("bookmakerName") as string) || "—"}
          </span>
        ),
      },
      {
        id: "value",
        header: "Value",
        accessorFn: (row: OddsDBRow) => row.value,
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <span className="text-xs font-mono">
            {row.original.value ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "winning",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Settled" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => (
          <StatusBadge
            status={
              (row.getValue("winning") ? "success" : "pending") as
                | "success"
                | "pending"
            }
            className="text-xs"
          />
        ),
      },
      {
        accessorKey: "startingAtTimestamp",
        header: ({ column }: { column: Column<OddsDBRow, unknown> }) => (
          <DataTableColumnHeader column={column} title="Start At" />
        ),
        cell: ({ row }: { row: Row<OddsDBRow> }) => {
          const ts = row.getValue("startingAtTimestamp") as number;
          return (
            <span className="text-xs sm:text-sm">{formatStartAt(ts)}</span>
          );
        },
      },
    ];

    return dbColumns;
  }, [mode]);

  const tableData = useMemo(() => {
    if (mode === "provider") return groupedProviderData;
    return dbData?.data || [];
  }, [mode, groupedProviderData, dbData]);

  const table = useReactTable<GroupedOdds | OddsDBRow>({
    data: tableData as (GroupedOdds | OddsDBRow)[],
    columns: columns as ColumnDef<GroupedOdds | OddsDBRow>[],
    state: { sorting, globalFilter, columnVisibility, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Match other tables: show skeleton only on initial load (no data yet)
  const isModeLoading = useMemo(() => {
    if (mode === "db") {
      return isLoading && !dbData;
    }
    return isLoading && unifiedData.length === 0;
  }, [mode, isLoading, dbData, unifiedData]);

  if (isModeLoading) {
    return <TableSkeleton columnCount={columns.length} />;
  }

  if (error) {
    return <TableError error={error} />;
  }

  const handleRowClick = (row: GroupedOdds | OddsDBRow) => {
    if (mode === "provider") {
      setSelectedGroupedOdd(row as GroupedOdds);
      setSelectedOdd(null);
    } else {
      // For DB mode, convert to UnifiedOdds format if needed
      const dbOdd = row as OddsDBRow;
      setSelectedOdd({
        externalId: dbOdd.externalId,
        source: "db",
        status: "ok",
        fixtureExternalId: dbOdd.fixtureExternalId,
        bookmakerExternalId: dbOdd.bookmakerExternalId,
        bookmakerName: dbOdd.bookmakerName,
        marketExternalId: dbOdd.marketExternalId,
        marketName: dbOdd.marketName,
        label: dbOdd.label,
        value: dbOdd.value,
        winning: dbOdd.winning,
        startingAtTs: dbOdd.startingAtTimestamp,
        dbData: {
          id: dbOdd.id,
          externalId: dbOdd.externalId,
          fixtureExternalId: dbOdd.fixtureExternalId,
          fixtureName: dbOdd.fixtureName,
          bookmakerExternalId: dbOdd.bookmakerExternalId,
          bookmakerName: dbOdd.bookmakerName,
          marketExternalId: dbOdd.marketExternalId,
          marketName: dbOdd.marketName,
          marketDescription: dbOdd.marketDescription,
          label: dbOdd.label,
          value: dbOdd.value,
          probability: dbOdd.probability,
          winning: dbOdd.winning,
          startingAtTs: dbOdd.startingAtTimestamp,
          updatedAt: dbOdd.updatedAt,
        },
      } as UnifiedOdds);
      setSelectedGroupedOdd(null);
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TableControls
        table={table}
        searchPlaceholder="Search odds..."
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        showDiffFilter={mode === "provider" && !!onDiffFilterChange}
        diffFilter={diffFilter}
        onDiffFilterChange={onDiffFilterChange}
      />
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const data = row.original;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(data)}
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
              })
            ) : (
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
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        table={table}
        pagination={pagination}
        onPaginationChange={setPagination}
        dataLength={tableData.length}
      />

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="text-left flex-shrink-0">
            {(() => {
              const now = Math.floor(Date.now() / 1000);
              let startTs: number = 0;
              let odds: UnifiedOdds[] = [];
              let fixtureName: string | null = null;
              let marketName: string | null = null;

              if (mode === "provider" && selectedGroupedOdd) {
                startTs = selectedGroupedOdd.startingAtTs;
                odds = selectedGroupedOdd.odds;
                fixtureName = selectedGroupedOdd.fixtureName;
                marketName = selectedGroupedOdd.marketName;
              } else if (selectedOdd && "startingAtTs" in selectedOdd) {
                // UnifiedOdds case
                startTs = selectedOdd.startingAtTs || 0;
                odds = [selectedOdd];
                fixtureName =
                  ("providerData" in selectedOdd &&
                    selectedOdd.providerData?.fixtureName) ||
                  ("dbData" in selectedOdd &&
                    selectedOdd.dbData?.fixtureName) ||
                  null;
                marketName = selectedOdd.marketName;
              } else if (selectedOdd && "startingAtTimestamp" in selectedOdd) {
                // OddsDBRow case
                startTs = selectedOdd.startingAtTimestamp || 0;
                odds = [
                  {
                    ...selectedOdd,
                    startingAtTs: selectedOdd.startingAtTimestamp,
                    source: "db" as const,
                    status: "ok" as const,
                  } as UnifiedOdds,
                ];
                fixtureName = selectedOdd.fixtureName;
                marketName = selectedOdd.marketName;
              }

              let fixtureState: string | null = null;
              if (startTs > 0 && odds.length > 0) {
                if (startTs > now) {
                  fixtureState = "upcoming";
                } else {
                  const allWinningFalse = odds.every((odd) => !odd.winning);
                  if (allWinningFalse) {
                    fixtureState = "live";
                  } else {
                    fixtureState = "full time";
                  }
                }
              }

              const variantMap: Record<
                string,
                "default" | "secondary" | "destructive" | "outline"
              > = {
                upcoming: "secondary",
                live: "destructive",
                "full time": "default",
              };

              return (
                <>
                  {/* Market name as title, fixture name + state as subtitle (same for mobile and desktop) */}
                  <DialogTitle className="text-base sm:text-lg">
                    {marketName || "Market"}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    <span className="text-xs sm:text-sm">
                      {fixtureName || "Fixture"}
                    </span>
                    {fixtureState && (
                      <Badge
                        variant={variantMap[fixtureState] || "outline"}
                        className="text-xs"
                      >
                        {fixtureState}
                      </Badge>
                    )}
                  </DialogDescription>
                </>
              );
            })()}
          </DialogHeader>

          {mode === "provider" && selectedGroupedOdd ? (
            <div className="space-y-2 sm:space-y-4 flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 flex-shrink-0">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Fixture External ID
                  </label>
                  <p className="text-xs font-mono break-all">
                    {selectedGroupedOdd.fixtureExternalId}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Market External ID
                  </label>
                  <p className="text-xs font-mono break-all">
                    {selectedGroupedOdd.marketExternalId}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Status in DB
                  </label>
                  <p className="text-xs">
                    <StatusBadge
                      status={
                        selectedGroupedOdd.status as
                          | "ok"
                          | "missing-in-db"
                          | "extra-in-db"
                          | "mismatch"
                          | "new"
                      }
                      className="text-xs"
                    />
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Start At
                  </label>
                  <p className="text-xs break-words">
                    {selectedGroupedOdd.startingAtTs
                      ? format(
                          new Date(selectedGroupedOdd.startingAtTs * 1000),
                          "PPpp"
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 flex-1 min-h-0 flex flex-col overflow-hidden">
                <h4 className="text-xs sm:text-sm font-semibold flex-shrink-0">
                  All Odds
                </h4>
                <div className="border rounded-lg overflow-auto flex-1 min-h-0 -mx-2 sm:mx-0">
                  <div className="min-w-full inline-block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs px-2 sm:px-4">
                            Bookmaker
                          </TableHead>
                          <TableHead className="text-xs px-2 sm:px-4">
                            Label
                          </TableHead>
                          <TableHead className="text-xs px-2 sm:px-4">
                            Value
                          </TableHead>
                          <TableHead className="text-xs px-2 sm:px-4">
                            Winning
                          </TableHead>
                          <TableHead className="text-xs px-2 sm:px-4">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroupedOdd.odds.map((odd) => (
                          <TableRow key={odd.externalId}>
                            <TableCell className="text-xs whitespace-nowrap px-2 sm:px-4">
                              {odd.bookmakerName || "—"}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap px-2 sm:px-4">
                              {odd.label}
                            </TableCell>
                            <TableCell className="text-xs font-semibold whitespace-nowrap px-2 sm:px-4">
                              {odd.value}
                            </TableCell>
                            <TableCell className="text-xs px-2 sm:px-4">
                              <div className="flex items-center justify-center">
                                {odd.winning ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs px-2 sm:px-4">
                              <StatusBadge
                                status={
                                  odd.status as
                                    | "ok"
                                    | "missing-in-db"
                                    | "extra-in-db"
                                    | "mismatch"
                                    | "new"
                                }
                                className="text-xs"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            selectedOdd && (
              <div className="space-y-2 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      External ID
                    </label>
                    <p className="text-xs font-mono break-all">
                      {selectedOdd.externalId}
                    </p>
                  </div>
                  {"status" in selectedOdd && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Status in DB
                      </label>
                      <p className="text-xs">
                        <StatusBadge
                          status={
                            selectedOdd.status as
                              | "ok"
                              | "missing-in-db"
                              | "extra-in-db"
                              | "mismatch"
                              | "new"
                          }
                          className="text-xs"
                        />
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Fixture External ID
                    </label>
                    <p className="text-xs font-mono break-all">
                      {selectedOdd.fixtureExternalId}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Fixture Name
                    </label>
                    <p className="text-xs break-words">
                      {("providerData" in selectedOdd &&
                        selectedOdd.providerData?.fixtureName) ||
                        ("dbData" in selectedOdd &&
                          selectedOdd.dbData?.fixtureName) ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Bookmaker
                    </label>
                    <p className="text-xs break-words">
                      {selectedOdd.bookmakerName || "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Market
                    </label>
                    <p className="text-xs break-words">
                      {selectedOdd.marketName || "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Market External ID
                    </label>
                    <p className="text-xs font-mono break-all">
                      {selectedOdd.marketExternalId}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Label
                    </label>
                    <p className="text-xs break-words">{selectedOdd.label}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Value
                    </label>
                    <p className="text-xs font-semibold break-words">
                      {selectedOdd.value}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Settled
                    </label>
                    <p className="text-xs">
                      <StatusBadge
                        status={selectedOdd.winning ? "success" : "pending"}
                        className="text-xs"
                      />
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Start At
                    </label>
                    <p className="text-xs break-words">
                      {"startingAtTs" in selectedOdd && selectedOdd.startingAtTs
                        ? format(
                            new Date(
                              (selectedOdd.startingAtTs as number) * 1000
                            ),
                            "PPpp"
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                {"providerData" in selectedOdd && selectedOdd.providerData && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Provider Data</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedOdd.providerData.marketDescription && (
                        <div>
                          <span className="text-muted-foreground">
                            Market Description:{" "}
                          </span>
                          <span>
                            {selectedOdd.providerData.marketDescription}
                          </span>
                        </div>
                      )}
                      {selectedOdd.providerData.probability && (
                        <div>
                          <span className="text-muted-foreground">
                            Probability:{" "}
                          </span>
                          <span>{selectedOdd.providerData.probability}</span>
                        </div>
                      )}
                      {selectedOdd.providerData.handicap != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Handicap:{" "}
                          </span>
                          <span>{selectedOdd.providerData.handicap}</span>
                        </div>
                      )}
                      {selectedOdd.providerData.total != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Total:{" "}
                          </span>
                          <span>{selectedOdd.providerData.total}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {"dbData" in selectedOdd && selectedOdd.dbData && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Database Data</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedOdd.dbData.marketDescription && (
                        <div>
                          <span className="text-muted-foreground">
                            Market Description:{" "}
                          </span>
                          <span>{selectedOdd.dbData.marketDescription}</span>
                        </div>
                      )}
                      {selectedOdd.dbData.probability && (
                        <div>
                          <span className="text-muted-foreground">
                            Probability:{" "}
                          </span>
                          <span>{selectedOdd.dbData.probability}</span>
                        </div>
                      )}
                      {selectedOdd.dbData.handicap != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Handicap:{" "}
                          </span>
                          <span>{selectedOdd.dbData.handicap}</span>
                        </div>
                      )}
                      {selectedOdd.dbData.total != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Total:{" "}
                          </span>
                          <span>{selectedOdd.dbData.total}</span>
                        </div>
                      )}
                      {selectedOdd.dbData.updatedAt && (
                        <div>
                          <span className="text-muted-foreground">
                            Updated:{" "}
                          </span>
                          <span>
                            {format(
                              new Date(selectedOdd.dbData.updatedAt),
                              "PPpp"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
