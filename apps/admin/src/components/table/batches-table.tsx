import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Trophy,
  Calendar,
  Users,
  CalendarDays,
  Bookmark,
  Layers,
  Database,
} from "lucide-react";
import type { Batch } from "@repo/types";
import { BatchDetailContent } from "@/components/sync-center/batch-detail-content";

function EntityBadge({ name }: { name: string }) {
  const config: Record<string, { label: string; icon: React.ElementType }> = {
    "seed-countries": { label: "Countries", icon: Globe },
    "seed-leagues": { label: "Leagues", icon: Trophy },
    "seed-seasons": { label: "Seasons", icon: Calendar },
    "seed-teams": { label: "Teams", icon: Users },
    "seed-fixtures": { label: "Fixtures", icon: CalendarDays },
    "seed-bookmakers": { label: "Bookmakers", icon: Bookmark },
    "seed-season": { label: "Full Season", icon: Layers },
  };

  const { label, icon: Icon } = config[name] ?? {
    label: name,
    icon: Database,
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ContextCell({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta) return <span className="text-muted-foreground">—</span>;

  const season = (meta.season as { name?: string; league?: string } | undefined)
    ?.name;
  const league = (meta.season as { name?: string; league?: string } | undefined)
    ?.league;

  if (season && league) {
    return (
      <span className="text-sm text-muted-foreground">
        {league} · {season}
      </span>
    );
  }

  if (season) {
    return <span className="text-sm text-muted-foreground">{season}</span>;
  }

  return <span className="text-muted-foreground">—</span>;
}

function TimeAgo({ date }: { date: string }) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  let text: string;
  if (diffMins < 60) {
    text = rtf.format(-diffMins, "minute");
  } else if (diffHours < 24) {
    text = rtf.format(-diffHours, "hour");
  } else {
    text = rtf.format(-diffDays, "day");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm text-muted-foreground cursor-help">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{new Date(date).toLocaleString()}</TooltipContent>
    </Tooltip>
  );
}

function ItemsCell({ total, failed }: { total: number; failed: number }) {
  if (failed === 0) {
    return <span className="text-sm">{total}</span>;
  }

  return (
    <span className="text-sm">
      {total} <span className="text-red-600">({failed} failed)</span>
    </span>
  );
}

function DurationCell({
  started,
  finished,
}: {
  started: Date;
  finished: Date | null;
}) {
  if (!finished) {
    return <span className="text-muted-foreground">—</span>;
  }

  const diffMs = finished.getTime() - started.getTime();
  const seconds = Math.round(diffMs / 1000);

  if (seconds < 60) {
    return <span className="text-sm text-muted-foreground">{seconds}s</span>;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return (
    <span className="text-sm text-muted-foreground">
      {minutes}m {remainingSeconds}s
    </span>
  );
}

interface BatchesTableProps {
  batches: Batch[];
  isLoading?: boolean;
}

export function BatchesTable({ batches, isLoading }: BatchesTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sorting, setSorting] = useState([{ id: "startedAt", desc: true }]);

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: "name",
      header: "Entity",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <EntityBadge name={name} />;
      },
    },
    {
      accessorKey: "meta",
      header: "Context",
      cell: ({ row }) => {
        const meta = row.original.meta ?? null;
        return <ContextCell meta={meta} />;
      },
    },
    {
      accessorKey: "startedAt",
      header: "When",
      cell: ({ row }) => {
        const startedAt = row.getValue("startedAt") as string;
        return <TimeAgo date={startedAt} />;
      },
    },
    {
      accessorKey: "status",
      header: "Result",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <StatusBadge status={status} />;
      },
    },
    {
      id: "items",
      header: "Items",
      cell: ({ row }) => {
        const total = row.original.itemsTotal;
        const failed = row.original.itemsFailed;
        return <ItemsCell total={total} failed={failed} />;
      },
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const started = new Date(row.original.startedAt);
        const finished = row.original.finishedAt
          ? new Date(row.original.finishedAt)
          : null;
        return <DurationCell started={started} finished={finished} />;
      },
    },
  ];

  const table = useReactTable({
    data: batches,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
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
        <div
          className="rounded-md border overflow-auto"
          style={{ maxHeight: "600px" }}
        >
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
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
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

      {/* Batch Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedBatch && <BatchDetailContent batch={selectedBatch} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
