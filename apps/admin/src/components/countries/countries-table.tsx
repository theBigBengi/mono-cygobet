import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UnifiedCountry } from "@/types/countries";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@/types/api";

type CountryDBRow = AdminCountriesListResponse["data"][0];
type CountryProviderRow = AdminProviderCountriesResponse["data"][0];

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

interface CountriesTableProps {
  mode: "diff" | "db" | "provider";
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
}

export function CountriesTable({
  mode,
  unifiedData = [],
  diffFilter = "all",
  onDiffFilterChange,
  dbData,
  providerData,
  isLoading = false,
  error = null,
}: CountriesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  // Filter unified data for diff mode
  const filteredDiffData = useMemo(() => {
    if (mode !== "diff") return [];
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
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (mode === "diff") {
      return [
        {
          accessorKey: "status",
          header: "Status",
          cell: ({ row }: { row: any }) => {
            const status = row.getValue("status") as UnifiedCountry["status"];
            const statusConfig: Record<
              UnifiedCountry["status"],
              { label: string; variant: "destructive" | "secondary" | "default" }
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
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
            );
          },
        },
        {
          accessorKey: "externalId",
          header: "externalId",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-xs">{row.getValue("externalId")}</span>
          ),
        },
        {
          id: "name-db",
          header: "Name (DB)",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            return (
              <span className="text-sm">
                {country.dbData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "name-provider",
          header: "Name (Provider)",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            return (
              <span className="text-sm">
                {country.providerData?.name || "—"}
              </span>
            );
          },
        },
        {
          id: "iso2-db",
          header: "ISO2 (DB)",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            return (
              <span className="text-sm font-mono">
                {country.dbData?.iso2 || "—"}
              </span>
            );
          },
        },
        {
          id: "iso2-provider",
          header: "ISO2 (Provider)",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            return (
              <span className="text-sm font-mono">
                {country.providerData?.iso2 || "—"}
              </span>
            );
          },
        },
        {
          id: "iso3-db",
          header: "ISO3 (DB)",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            return (
              <span className="text-sm font-mono">
                {country.dbData?.iso3 || "—"}
              </span>
            );
          },
        },
        {
          id: "iso3-provider",
          header: "ISO3 (Provider)",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            return (
              <span className="text-sm font-mono">
                {country.providerData?.iso3 || "—"}
              </span>
            );
          },
        },
        {
          id: "image",
          header: "Image",
          cell: ({ row }: { row: any }) => {
            const country = row.original as UnifiedCountry;
            const imagePath = country.imagePath;
            if (!imagePath) return <span className="text-muted-foreground">—</span>;
            return (
              <img
                src={imagePath}
                alt=""
                className="w-8 h-6 object-cover rounded border"
              />
            );
          },
        },
      ];
    } else if (mode === "db") {
      return [
        {
          accessorKey: "externalId",
          header: "externalId",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-xs">{row.getValue("externalId")}</span>
          ),
        },
        {
          accessorKey: "name",
          header: "Name",
          cell: ({ row }: { row: any }) => (
            <span className="font-medium">{row.getValue("name")}</span>
          ),
        },
        {
          accessorKey: "iso2",
          header: "ISO2",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-sm">
              {row.getValue("iso2") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "iso3",
          header: "ISO3",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-sm">
              {row.getValue("iso3") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "imagePath",
          header: "Image",
          cell: ({ row }: { row: any }) => {
            const imagePath = row.getValue("imagePath") as string | null;
            if (!imagePath) return <span className="text-muted-foreground">—</span>;
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
          cell: ({ row }: { row: any }) => {
            const updatedAt = row.getValue("updatedAt") as string | undefined;
            if (!updatedAt) return <span className="text-muted-foreground">—</span>;
            return (
              <span className="text-xs text-muted-foreground">
                {new Date(updatedAt).toLocaleDateString()}
              </span>
            );
          },
        },
      ];
    } else {
      // provider mode
      return [
        {
          accessorKey: "externalId",
          header: "externalId",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-xs">
              {String(row.getValue("externalId"))}
            </span>
          ),
        },
        {
          accessorKey: "name",
          header: "Name",
          cell: ({ row }: { row: any }) => (
            <span className="font-medium">{row.getValue("name")}</span>
          ),
        },
        {
          accessorKey: "iso2",
          header: "ISO2",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-sm">
              {row.getValue("iso2") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "iso3",
          header: "ISO3",
          cell: ({ row }: { row: any }) => (
            <span className="font-mono text-sm">
              {row.getValue("iso3") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "imagePath",
          header: "Image",
          cell: ({ row }: { row: any }) => {
            const imagePath = row.getValue("imagePath") as string | null | undefined;
            if (!imagePath) return <span className="text-muted-foreground">—</span>;
            return (
              <img
                src={imagePath}
                alt=""
                className="w-8 h-6 object-cover rounded border"
              />
            );
          },
        },
      ];
    }
  }, [mode]);

  // Get table data based on mode
  const tableData = useMemo(() => {
    if (mode === "diff") {
      return filteredDiffData;
    } else if (mode === "db") {
      const data = dbData?.data || [];
      console.log("[CountriesTable] DB mode - dbData:", dbData);
      console.log("[CountriesTable] DB mode - data array:", data);
      console.log("[CountriesTable] DB mode - data length:", data.length);
      return data;
    } else {
      return providerData?.data || [];
    }
  }, [mode, filteredDiffData, dbData, providerData]);

  // Only show loading if we're actually loading AND have no data
  // Check mode-specific loading state
  const isModeLoading = useMemo(() => {
    if (mode === "db") {
      const loading = isLoading && !dbData;
      console.log("[CountriesTable] DB mode loading check:", { isLoading, hasDbData: !!dbData, loading });
      return loading;
    } else if (mode === "provider") {
      return isLoading && !providerData;
    } else {
      return isLoading && unifiedData.length === 0;
    }
  }, [mode, isLoading, dbData, providerData, unifiedData]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      if (mode === "diff") {
        const country = row.original as UnifiedCountry;
        return (
          country.externalId.toLowerCase().includes(search) ||
          country.name.toLowerCase().includes(search) ||
          country.dbData?.name?.toLowerCase().includes(search) ||
          country.providerData?.name?.toLowerCase().includes(search) ||
          country.iso2?.toLowerCase().includes(search) ||
          country.iso3?.toLowerCase().includes(search) ||
          false
        );
      } else if (mode === "db") {
        const country = row.original as CountryDBRow;
        return (
          country.name.toLowerCase().includes(search) ||
          country.externalId.toLowerCase().includes(search) ||
          country.iso2?.toLowerCase().includes(search) ||
          country.iso3?.toLowerCase().includes(search) ||
          false
        );
      } else {
        const country = row.original as CountryProviderRow;
        return (
          country.name.toLowerCase().includes(search) ||
          String(country.externalId).toLowerCase().includes(search) ||
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
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

  // Debug: Show raw data info
  console.log("[CountriesTable] Final render - mode:", mode);
  console.log("[CountriesTable] Final render - tableData:", tableData);
  console.log("[CountriesTable] Final render - tableData.length:", tableData.length);
  console.log("[CountriesTable] Final render - columns.length:", columns.length);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4">
        {mode === "diff" && onDiffFilterChange && (
          <Select value={diffFilter} onValueChange={onDiffFilterChange}>
            <SelectTrigger className="w-[180px]">
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
        <Input
          placeholder="Search countries..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {mode === "db" && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Page size:</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(v) => {
                const newPageSize = Number(v);
                setPagination({ ...pagination, pageSize: newPageSize, pageIndex: 0 });
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
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
              console.log("[CountriesTable] Rendering - tableData length:", tableData.length);
              console.log("[CountriesTable] Rendering - rows length:", rows?.length);
              console.log("[CountriesTable] Rendering - mode:", mode);
              
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {table.getFilteredRowModel().rows.length > 0
              ? pagination.pageIndex * pagination.pageSize + 1
              : 0}{" "}
            to{" "}
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} countries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

