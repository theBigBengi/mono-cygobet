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
import { CloudSync, CheckCircle2, XCircle } from "lucide-react";
import {
  TablePagination,
  TableControls,
  TableSkeleton,
  TableError,
  ImageCell,
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
import type { UnifiedCountry } from "@/types";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@repo/types";

type CountryDBRow = AdminCountriesListResponse["data"][0];

import type { DiffFilter } from "@/types";
import { useColumnVisibility } from "@/hooks/use-column-visibility";

interface CountriesTableProps {
  mode: "db" | "provider";
  // For diff mode
  unifiedData?: UnifiedCountry[];
  diffFilter?: DiffFilter;
  onDiffFilterChange?: (filter: DiffFilter) => void;
  // For db mode
  dbData?: AdminCountriesListResponse;
  // For provider mode
  providerData?: AdminProviderCountriesResponse;
  isLoading?: boolean;
  error?: Error | null;
  // Sync handler
  onSyncCountry?: (externalId: string) => Promise<void>;
}

export function CountriesTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  isLoading = false,
  error = null,
  onSyncCountry,
}: CountriesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(
    "countries-table",
    {}
  );
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<UnifiedCountry | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (country: UnifiedCountry | CountryDBRow) => {
    if (mode === "provider") {
      setSelectedCountry(country as UnifiedCountry);
    } else {
      // For DB mode, find the unified country from unifiedData
      const unifiedCountry = unifiedData.find(
        (c) => c.externalId === country.externalId
      );
      setSelectedCountry(unifiedCountry || null);
    }
    setIsDialogOpen(true);
  };

  // Filter unified data for provider mode (shows diff)
  const filteredDiffData = useMemo(() => {
    if (mode !== "provider") return [];
    let filtered = unifiedData;
    if (diffFilter === "missing") {
      filtered = filtered.filter((c) => c.status === "missing-in-db");
    } else if (diffFilter === "mismatch") {
      filtered = filtered.filter((c) => c.status === "mismatch");
    } else if (diffFilter === "extra") {
      filtered = filtered.filter((c) => c.status === "extra-in-db");
    } else if (diffFilter === "ok") {
      filtered = filtered.filter((c) => c.status === "ok");
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
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const status = row.getValue("status") as UnifiedCountry["status"];
            return <StatusBadge status={status} className="text-xs" />;
          },
        },
        {
          accessorKey: "externalId",
          header: ({
            column,
          }: {
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => (
            <span className="font-mono text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {country.dbData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "name-provider",
          header: "Name (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return (
              <span className="text-xs sm:text-sm">
                {country.providerData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "iso2-db",
          header: "ISO2 (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return (
              <span className="text-xs sm:text-sm font-mono">
                {country.dbData?.iso2 || "—"}
              </span>
            );
          },
        },
        {
          id: "iso2-provider",
          header: "ISO2 (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return (
              <span className="text-xs sm:text-sm font-mono">
                {country.providerData?.iso2 || "—"}
              </span>
            );
          },
        },
        {
          id: "iso3-db",
          header: "ISO3 (DB)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return (
              <span className="text-xs sm:text-sm font-mono">
                {country.dbData?.iso3 || "—"}
              </span>
            );
          },
        },
        {
          id: "iso3-provider",
          header: "ISO3 (Provider)",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return (
              <span className="text-xs sm:text-sm font-mono">
                {country.providerData?.iso3 || "—"}
              </span>
            );
          },
        },
        {
          id: "leagues",
          header: "Leagues",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            if (mode === "provider") {
              // For provider mode, show leagues count
              const leaguesCount = country.leaguesCount ?? 0;
              return (
                <div className="flex items-center justify-center">
                  <span className="text-xs text-foreground">
                    {leaguesCount}
                  </span>
                </div>
              );
            } else {
              // For DB mode, show leagues count from DB
              const leaguesCount =
                country.leaguesCount ?? country.dbData?.leaguesCount ?? 0;
              return (
                <div className="flex items-center justify-center">
                  <span
                    className={`text-xs ${
                      !leaguesCount
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {leaguesCount || 0}
                  </span>
                </div>
              );
            }
          },
        },
        {
          id: "image",
          header: "Image",
          enableSorting: false,
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            return <ImageCell imagePath={country.imagePath} />;
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
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="externalId" />,
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
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
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-medium text-xs sm:text-sm">
              {row.getValue("name")}
            </span>
          ),
        },
        {
          accessorKey: "active",
          header: "Active",
          enableSorting: false,
          cell: ({ row }: { row: Row<CountryDBRow> }) => {
            const active = (row.original as { active?: boolean | null })
              .active;
            if (active == null)
              return (
                <span className="text-xs text-muted-foreground">—</span>
              );
            return active ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            );
          },
        },
        {
          accessorKey: "iso2",
          header: ({
            column,
          }: {
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="ISO2" />,
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-mono text-xs sm:text-sm">
              {row.getValue("iso2") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "iso3",
          header: ({
            column,
          }: {
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="ISO3" />,
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-mono text-xs sm:text-sm">
              {row.getValue("iso3") || "—"}
            </span>
          ),
        },
        {
          id: "leagues",
          header: "Leagues",
          enableSorting: false,
          cell: ({ row }: { row: Row<CountryDBRow> }) => {
            const country = row.original;
            // Try to get leagues count from unifiedData if available
            const unifiedCountry = unifiedData.find(
              (c) => c.externalId === country.externalId
            );
            const leaguesCount =
              unifiedCountry?.leaguesCount ??
              unifiedCountry?.dbData?.leaguesCount ??
              0;
            return (
              <div className="flex items-center justify-center">
                <span
                  className={`text-xs ${
                    !leaguesCount ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {leaguesCount || 0}
                </span>
              </div>
            );
          },
        },
        {
          accessorKey: "imagePath",
          header: "Image",
          enableSorting: false,
          cell: ({ row }: { row: Row<CountryDBRow> }) => {
            const imagePath = row.getValue("imagePath") as string | null;
            return <ImageCell imagePath={imagePath} />;
          },
        },
        {
          accessorKey: "updatedAt",
          header: ({
            column,
          }: {
            column: Column<UnifiedCountry | CountryDBRow, unknown>;
          }) => <DataTableColumnHeader column={column} title="Updated At" />,
          cell: ({ row }: { row: Row<CountryDBRow> }) => {
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
      // provider mode - shows diff view with status column
      // This should never be reached since provider mode is handled above
      return [];
    }
  }, [mode, unifiedData]);

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

  const table = useReactTable<UnifiedCountry | CountryDBRow>({
    data: tableData as (UnifiedCountry | CountryDBRow)[],
    columns: columns as ColumnDef<UnifiedCountry | CountryDBRow>[],
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
        const country = row.original as unknown as UnifiedCountry;
        return (
          country.externalId.toLowerCase().includes(search) ||
          country.name.toLowerCase().includes(search) ||
          country.dbData?.name?.toLowerCase().includes(search) ||
          country.providerData?.name?.toLowerCase().includes(search) ||
          country.iso2?.toLowerCase().includes(search) ||
          country.iso3?.toLowerCase().includes(search) ||
          false
        );
      } else {
        // DB mode
        const country = row.original as CountryDBRow;
        return (
          country.name.toLowerCase().includes(search) ||
          country.externalId.toLowerCase().includes(search) ||
          country.iso2?.toLowerCase().includes(search) ||
          country.iso3?.toLowerCase().includes(search) ||
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
        searchPlaceholder="Search countries..."
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
                  const country = row.original as UnifiedCountry | CountryDBRow;

                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(country)}
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
              {selectedCountry
                ? `Sync ${selectedCountry.name}`
                : "Sync Country"}
            </DialogTitle>
            <DialogDescription>
              {selectedCountry && (
                <>
                  External ID:{" "}
                  <span className="font-mono">
                    {selectedCountry.externalId}
                  </span>
                  <br />
                  Status:{" "}
                  <span className="capitalize">
                    {selectedCountry.status.replace("-", " ")}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedCountry && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name (DB)</p>
                  <p className="font-medium">
                    {selectedCountry.dbData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name (Provider)</p>
                  <p className="font-medium">
                    {selectedCountry.providerData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ISO2</p>
                  <p className="font-mono">{selectedCountry.iso2 || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ISO3</p>
                  <p className="font-mono">{selectedCountry.iso3 || "—"}</p>
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
                if (!selectedCountry || !onSyncCountry) return;
                const isSyncing = syncingIds.has(selectedCountry.externalId);
                if (isSyncing) return;

                setSyncingIds((prev) =>
                  new Set(prev).add(selectedCountry.externalId)
                );
                try {
                  await onSyncCountry(selectedCountry.externalId);
                  setIsDialogOpen(false);
                } catch (error) {
                  console.error("Sync failed:", error);
                } finally {
                  setSyncingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selectedCountry.externalId);
                    return next;
                  });
                }
              }}
              disabled={
                !selectedCountry ||
                !onSyncCountry ||
                syncingIds.has(selectedCountry.externalId)
              }
            >
              {syncingIds.has(selectedCountry?.externalId || "") ? (
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
