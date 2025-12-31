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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CloudSync } from "lucide-react";
import type { UnifiedCountry } from "@/types/countries";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@/types/api";

type CountryDBRow = AdminCountriesListResponse["data"][0];

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

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
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

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
          header: "Status",
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const status = row.getValue("status") as UnifiedCountry["status"];
            const statusConfig: Record<
              UnifiedCountry["status"],
              {
                label: string;
                variant: "destructive" | "secondary" | "default";
              }
            > = {
              "missing-in-db": { label: "Missing", variant: "destructive" },
              mismatch: { label: "Mismatch", variant: "destructive" },
              "extra-in-db": { label: "Extra", variant: "secondary" },
              ok: { label: "OK", variant: "default" },
              "no-leagues": { label: "No Leagues", variant: "secondary" },
              "iso-missing": { label: "ISO Missing", variant: "secondary" },
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
          cell: ({ row }: { row: Row<UnifiedCountry> }) => (
            <span className="font-mono text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
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
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            if (mode === "provider") {
              // For provider mode, show available leagues count
              const availableLeagues = country.availableLeaguesCount ?? 0;
              const totalLeagues = country.providerData?.leaguesCount ?? 0;
              return (
                <div className="flex items-center justify-center">
                  <span className="text-xs text-foreground">
                    {availableLeagues}
                    {totalLeagues > 0 && (
                      <span className="text-muted-foreground">/{totalLeagues}</span>
                    )}
                  </span>
                </div>
              );
            } else {
              // For DB mode, show leagues count from DB
              const leaguesCount = country.leaguesCount ?? country.dbData?.leagues?.length ?? 0;
              return (
                <div className="flex items-center justify-center">
                  <span className={`text-xs ${
                    !leaguesCount ? "text-muted-foreground" : "text-foreground"
                  }`}>
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
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original;
            const imagePath = country.imagePath;
            if (!imagePath)
              return <span className="text-muted-foreground">—</span>;
            return (
              <img
                src={imagePath}
                alt=""
                className="w-8 h-6 object-cover rounded border"
              />
            );
          },
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }: { row: Row<UnifiedCountry> }) => {
            const country = row.original as UnifiedCountry;
            const isSyncing = syncingIds.has(country.externalId);

            const handleSync = async () => {
              if (!onSyncCountry) return;
              setSyncingIds((prev) => new Set(prev).add(country.externalId));
              try {
                await onSyncCountry(country.externalId);
              } catch (error) {
                console.error("Sync failed:", error);
              } finally {
                setSyncingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(country.externalId);
                  return next;
                });
              }
            };

            return (
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleSync}
                  disabled={isSyncing || !onSyncCountry}
                >
                  <CloudSync
                    className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            );
          },
        },
      ];
    } else if (mode === "db") {
      return [
        {
          accessorKey: "externalId",
          header: "externalId",
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-mono text-[10px] sm:text-xs">
              {row.getValue("externalId")}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: "Name",
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-medium text-xs sm:text-sm">
              {row.getValue("name")}
            </span>
          ),
        },
        {
          accessorKey: "iso2",
          header: "ISO2",
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-mono text-xs sm:text-sm">
              {row.getValue("iso2") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "iso3",
          header: "ISO3",
          cell: ({ row }: { row: Row<CountryDBRow> }) => (
            <span className="font-mono text-xs sm:text-sm">
              {row.getValue("iso3") || "—"}
            </span>
          ),
        },
        {
          id: "leagues",
          header: "Leagues",
          cell: ({ row }: { row: Row<CountryDBRow> }) => {
            const country = row.original;
            // Try to get leagues count from unifiedData if available
            const unifiedCountry = unifiedData.find(
              (c) => c.externalId === country.externalId
            );
            const leaguesCount =
              unifiedCountry?.leaguesCount ??
              unifiedCountry?.dbData?.leagues?.length ??
              (country as any)?.leagues?.length ??
              0;
            return (
              <div className="flex items-center justify-center">
                <span className={`text-xs ${
                  !leaguesCount ? "text-muted-foreground" : "text-foreground"
                }`}>
                  {leaguesCount || 0}
                </span>
              </div>
            );
          },
        },
        {
          accessorKey: "imagePath",
          header: "Image",
          cell: ({ row }: { row: Row<CountryDBRow> }) => {
            const imagePath = row.getValue("imagePath") as string | null;
            if (!imagePath)
              return <span className="text-muted-foreground">—</span>;
            return (
              <img
                src={imagePath}
                alt=""
                className="w-8 h-6 object-cover rounded border"
              />
            );
          },
        },
        {
          accessorKey: "updatedAt",
          header: "Updated At",
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
  }, [mode, syncingIds, onSyncCountry, unifiedData]);

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
    data: tableData as (UnifiedCountry | CountryDBRow)[],
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
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Controls skeleton */}
        <div className="flex-shrink-0 flex items-center gap-4 mb-2 sm:mb-4">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[300px]" />
        </div>
        {/* Table skeleton */}
        <div className="flex-1 min-h-0 border-t overflow-auto">
          <div className="p-4 space-y-3">
            {/* Header skeleton */}
            <div className="flex gap-4 pb-4 border-b">
              {Array.from({ length: columns.length }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {/* Rows skeleton */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {Array.from({ length: columns.length }).map((_, j) => (
                  <Skeleton key={j} className="h-8 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Pagination skeleton */}
        <div className="flex-shrink-0 flex items-center justify-between pt-2 sm:pt-4 border-t mt-2 sm:mt-4">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
        <p className="text-destructive font-medium">Error loading data</p>
        <p className="text-sm text-muted-foreground mt-1">{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
        <Input
          placeholder="Search countries..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1"
        />
        {mode === "provider" && onDiffFilterChange && (
          <Select value={diffFilter} onValueChange={onDiffFilterChange}>
            <SelectTrigger className="w-[120px] sm:w-[180px] h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="missing">Only Missing</SelectItem>
              <SelectItem value="mismatch">Only Mismatch</SelectItem>
              <SelectItem value="extra">Only Extra</SelectItem>
              <SelectItem value="ok">Only OK</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

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
                return rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ));
              }

              return (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {tableData.length === 0
                      ? `No countries found (tableData is empty, mode: ${mode})`
                      : `No rows after filtering/pagination (tableData: ${tableData.length}, rows: ${rows?.length || 0})`}
                  </TableCell>
                </TableRow>
              );
            })()}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {tableData.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between gap-1 sm:gap-2 pt-2 sm:pt-4 border-t mt-2 sm:mt-4 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <span className="text-muted-foreground whitespace-nowrap">
              {pagination.pageIndex * pagination.pageSize + 1}-{Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{" "}
              <span className="hidden sm:inline">of </span>
              <span className="sm:hidden">/</span>
              {table.getFilteredRowModel().rows.length}
            </span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(v) => {
                const newPageSize = Number(v);
                setPagination({
                  ...pagination,
                  pageSize: newPageSize,
                  pageIndex: 0,
                });
              }}
            >
              <SelectTrigger className="w-[50px] sm:w-[70px] h-6 sm:h-7 text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-6 sm:h-8 w-6 sm:w-auto px-1 sm:px-3"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline sm:ml-2">Previous</span>
            </Button>
            <span className="font-medium whitespace-nowrap">
              {pagination.pageIndex + 1}/{table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-6 sm:h-8 w-6 sm:w-auto px-1 sm:px-3"
            >
              <span className="hidden sm:inline sm:mr-2">Next</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
