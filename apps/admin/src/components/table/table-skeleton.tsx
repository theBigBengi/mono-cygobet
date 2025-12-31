import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columnCount: number;
  rowCount?: number;
}

export function TableSkeleton({
  columnCount,
  rowCount = 10,
}: TableSkeletonProps) {
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
            {Array.from({ length: columnCount }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* Rows skeleton */}
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: columnCount }).map((_, j) => (
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
