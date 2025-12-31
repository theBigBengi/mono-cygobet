import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { Batch, BatchItem } from "@/types/api";
import { useBatchItems } from "@/hooks/use-batches";

interface BatchesTableProps {
  batches: Batch[];
  isLoading?: boolean;
}

export function BatchesTable({ batches, isLoading }: BatchesTableProps) {
  const columns: ColumnDef<Batch>[] = [
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: Row<Batch> }) => {
        const batch = row.original;
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 md:px-3">
                <Eye className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">View Items</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] p-0 !grid !grid-rows-[auto_1fr] overflow-hidden">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-3 border-b">
                <DialogTitle className="text-sm sm:text-base">
                  {batch.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  ID: {batch.id} · Items: {batch.itemsTotal}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
                <BatchItemsDialogContent batchId={batch.id} />
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
    {
      accessorKey: "id",
      header: "Batch ID",
      cell: ({ row }: { row: Row<Batch> }) => (
        <span className="font-mono text-sm">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Job Name",
      cell: ({ row }: { row: Row<Batch> }) => (
        <span className="text-sm">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: Row<Batch> }) => {
        const status = row.getValue("status") as string;
        const statusConfig: Record<
          string,
          { label: string; variant: "destructive" | "secondary" | "default" }
        > = {
          success: { label: "Success", variant: "default" },
          failed: { label: "Failed", variant: "destructive" },
          running: { label: "Running", variant: "secondary" },
          skipped: { label: "Skipped", variant: "secondary" },
          queued: { label: "Queued", variant: "secondary" },
        };
        const config = statusConfig[status] || statusConfig.success;
        return (
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "trigger",
      header: "Trigger",
      cell: ({ row }: { row: Row<Batch> }) => {
        const trigger = row.getValue("trigger") as string;
        return (
          <span className="text-xs capitalize text-muted-foreground">
            {trigger}
          </span>
        );
      },
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }: { row: Row<Batch> }) => {
        const version = row.getValue("version") as string | null;
        return (
          <span className="text-xs text-muted-foreground">
            {version || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "startedAt",
      header: "Started At",
      cell: ({ row }: { row: Row<Batch> }) => {
        const startedAt = row.getValue("startedAt") as string;
        return (
          <span className="text-xs text-muted-foreground">
            {new Date(startedAt).toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: "finishedAt",
      header: "Finished At",
      cell: ({ row }: { row: Row<Batch> }) => {
        const finishedAt = row.getValue("finishedAt") as string | null;
        return (
          <span className="text-xs text-muted-foreground">
            {finishedAt ? new Date(finishedAt).toLocaleString() : "—"}
          </span>
        );
      },
    },
    {
      id: "items",
      header: "Items",
      cell: ({ row }: { row: Row<Batch> }) => {
        const batch = row.original;
        return (
          <span className="text-xs text-muted-foreground">
            {batch.itemsSuccess} / {batch.itemsFailed} / {batch.itemsTotal}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: batches,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 min-h-0 border-t overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 9 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-6 w-full" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {batches.length > 0 && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 sm:pt-4 border-t mt-2 sm:mt-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-xs md:text-sm text-muted-foreground">
              Showing {batches.length} batches
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Page size:</span>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(v) => {
                  table.setPageSize(Number(v));
                }}
              >
                <SelectTrigger className="w-[70px] sm:w-[100px] h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Previous</span>
            </Button>
            <div className="text-xs md:text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-2">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchItemsDialogContent({ batchId }: { batchId: number }) {
  const [page, setPage] = useState(1);
  const perPage = 50;
  const { data, isLoading } = useBatchItems(batchId, page, perPage);

  const itemColumns: ColumnDef<BatchItem>[] = [
    {
      accessorKey: "itemKey",
      header: "externalId",
      cell: ({ row }: { row: Row<BatchItem> }) => (
        <span className="font-mono text-xs">
          {row.getValue("itemKey") || "—"}
        </span>
      ),
    },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: { row: Row<BatchItem> }) => {
          const status = row.getValue("status") as string;
          const statusConfig: Record<
            string,
            { label: string; variant: "destructive" | "secondary" | "default" }
          > = {
            success: { label: "Success", variant: "default" },
            failed: { label: "Failed", variant: "destructive" },
            skipped: { label: "Skipped", variant: "secondary" },
          };
          const config = statusConfig[status] || statusConfig.success;
          return (
            <span className="text-xs text-muted-foreground">
              {config.label}
            </span>
          );
        },
      },
    {
      accessorKey: "errorMessage",
      header: "Message",
      cell: ({ row }: { row: Row<BatchItem> }) => {
        const errorMessage = row.getValue("errorMessage") as string | null;
        if (!errorMessage)
          return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-xs text-muted-foreground max-w-md truncate block">
            {errorMessage.length > 100
              ? `${errorMessage.substring(0, 100)}...`
              : errorMessage}
          </span>
        );
      },
    },
    {
      accessorKey: "meta",
      header: "Meta",
      cell: ({ row }: { row: Row<BatchItem> }) => {
        const meta = row.getValue("meta") as Record<string, unknown>;
        if (!meta || Object.keys(meta).length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="text-xs text-muted-foreground">
            {Object.keys(meta).length} items
          </span>
        );
      },
    },
  ];

  const itemsTable = useReactTable({
    data: data?.data || [],
    columns: itemColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-xs sm:text-sm text-muted-foreground">
          No items found for this batch
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div className="border-t">
          <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {itemsTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-8 text-xs sm:text-sm">
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
            {itemsTable.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="h-8 text-xs sm:text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.pagination.totalPages > 1 && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            <span className="hidden sm:inline">Showing </span>
            {(page - 1) * perPage + 1}
            <span className="hidden sm:inline"> to </span>{" "}
            {Math.min(page * perPage, data.pagination.totalItems)}
            <span className="hidden sm:inline">
              {" "}
              of {data.pagination.totalItems} items
            </span>
            <span className="sm:hidden"> / {data.pagination.totalItems}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = page - 1;
                if (newPage >= 1) setPage(newPage);
              }}
              disabled={page === 1}
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1 sm:ml-2">Previous</span>
            </Button>
            <div className="text-[10px] sm:text-xs font-medium px-1 sm:px-2">
              Page {page} of {data.pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = page + 1;
                if (newPage <= data.pagination.totalPages) setPage(newPage);
              }}
              disabled={page >= data.pagination.totalPages}
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
            >
              <span className="hidden sm:inline mr-1 sm:mr-2">Next</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
