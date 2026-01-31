import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Table as TanStackTable } from "@tanstack/react-table";

interface TablePaginationProps<TData> {
  table: TanStackTable<TData>;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  onPaginationChange: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  dataLength: number;
  /** When set (e.g. server-side pagination), used for "of Z" total and range end */
  serverTotalItems?: number;
}

export function TablePagination<TData>({
  table,
  pagination,
  onPaginationChange,
  dataLength,
  serverTotalItems,
}: TablePaginationProps<TData>) {
  const totalItems =
    serverTotalItems ?? table.getFilteredRowModel().rows.length;
  const rangeEnd = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalItems
  );

  // Show pagination if there's data in the source or server reports a total
  if (dataLength === 0 && totalItems === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-between gap-2 sm:gap-2 pt-3 sm:pt-4 border-t mt-2 sm:mt-4 text-xs sm:text-sm">
      <div className="flex items-center gap-2 sm:gap-2 min-w-0 flex-1">
        <span className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">
          {pagination.pageIndex * pagination.pageSize + 1}-{rangeEnd}{" "}
          <span className="hidden sm:inline">of </span>
          <span className="sm:hidden">/</span>
          {totalItems}
        </span>
        <Select
          value={pagination.pageSize.toString()}
          onValueChange={(v) => {
            const newPageSize = Number(v);
            onPaginationChange({
              ...pagination,
              pageSize: newPageSize,
              pageIndex: 0,
            });
          }}
        >
          <SelectTrigger className="w-[65px] sm:w-[70px] h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 sm:h-9 w-8 sm:w-auto px-2 sm:px-3 min-w-[32px]"
        >
          <ChevronLeft className="h-4 w-4 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline sm:ml-2">Previous</span>
        </Button>
        <span className="font-medium whitespace-nowrap text-xs sm:text-sm min-w-[40px] text-center">
          {pagination.pageIndex + 1}/{table.getPageCount() || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 sm:h-9 w-8 sm:w-auto px-2 sm:px-3 min-w-[32px]"
        >
          <span className="hidden sm:inline sm:mr-2">Next</span>
          <ChevronRight className="h-4 w-4 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}
