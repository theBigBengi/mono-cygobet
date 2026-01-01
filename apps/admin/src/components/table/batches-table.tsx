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
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Batch, BatchItem } from "@repo/types";
import { useBatchItems } from "@/hooks/use-batches";

interface BatchesTableProps {
  batches: Batch[];
  isLoading?: boolean;
}

export function BatchesTable({ batches, isLoading }: BatchesTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "id",
      header: "Batch ID",
      cell: ({ row }: { row: Row<Batch> }) => (
        <span className="font-mono text-xs">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: { row: Row<Batch> }) => {
        const name = row.getValue("name") as string;
        return <span className="text-xs sm:text-sm">{name}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: Row<Batch> }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "success"
                ? "default"
                : status === "failed"
                  ? "destructive"
                  : "secondary"
            }
            className="text-xs"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "triggeredBy",
      header: "Triggered By",
      cell: ({ row }: { row: Row<Batch> }) => {
        const triggeredBy = row.getValue("triggeredBy") as string | null;
        return (
          <span className="text-xs text-muted-foreground">
            {triggeredBy || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "startedAt",
      header: "Started",
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
      header: "Finished",
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
      accessorKey: "itemsTotal",
      header: "Total",
      cell: ({ row }: { row: Row<Batch> }) => (
        <span className="text-xs">{row.getValue("itemsTotal")}</span>
      ),
    },
    {
      accessorKey: "itemsSuccess",
      header: "Success",
      cell: ({ row }: { row: Row<Batch> }) => (
        <span className="text-xs text-green-600">
          {row.getValue("itemsSuccess")}
        </span>
      ),
    },
    {
      accessorKey: "itemsFailed",
      header: "Failed",
      cell: ({ row }: { row: Row<Batch> }) => (
        <span className="text-xs text-red-600">
          {row.getValue("itemsFailed")}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: batches,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
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

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto" style={{ maxHeight: '600px' }}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-10">
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedBatch(row.original);
                      setIsDialogOpen(true);
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
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No batches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </p>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Batch Items Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBatch?.name || "Batch Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedBatch && (
                <>
                  ID: {selectedBatch.id} · Items: {selectedBatch.itemsTotal}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <BatchItemsDialogContent batchId={selectedBatch.id} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function BatchItemsDialogContent({ batchId }: { batchId: number }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const { data, isLoading } = useBatchItems(batchId, page, perPage);

  const itemColumns: ColumnDef<BatchItem>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }: { row: Row<BatchItem> }) => (
        <span className="font-mono text-xs">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "itemKey",
      header: "Item Key",
      cell: ({ row }: { row: Row<BatchItem> }) => {
        const itemKey = row.getValue("itemKey") as string | null;
        return (
          <span className="text-xs font-mono">
            {itemKey || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: Row<BatchItem> }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "success"
                ? "default"
                : status === "failed"
                  ? "destructive"
                  : "secondary"
            }
            className="text-xs"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "errorMessage",
      header: "Error",
      cell: ({ row }: { row: Row<BatchItem> }) => {
        const errorMessage = row.getValue("errorMessage") as string | null;
        return (
          <span className="text-xs text-red-600">
            {errorMessage || "—"}
          </span>
        );
      },
    },
  ];

  const itemTable = useReactTable({
    data: data?.data || [],
    columns: itemColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.pagination.totalPages ?? 0,
    initialState: {
      pagination: {
        pageSize: perPage,
      },
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-auto" style={{ maxHeight: '600px' }}>
        <Table>
          <TableHeader>
            {itemTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10">
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
            {itemTable.getRowModel().rows?.length ? (
              itemTable.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={itemColumns.length}
                  className="h-24 text-center"
                >
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {data?.pagination.totalPages ?? 0} · Total:{" "}
            {data?.pagination.totalItems ?? 0}
          </p>
          <Select
            value={String(perPage)}
            onValueChange={(value) => {
              setPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={perPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) =>
                Math.min(data?.pagination.totalPages ?? 1, p + 1)
              )
            }
            disabled={page >= (data?.pagination.totalPages ?? 0)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

