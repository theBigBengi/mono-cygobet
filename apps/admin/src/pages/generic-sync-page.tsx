import { useState } from "react";
import { PageFilters } from "@/components/filters/page-filters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchesTable } from "@/components/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminBatchesListResponse } from "@repo/types";
import type { ViewMode, DiffFilter } from "@/types";

export interface DiffStats {
  dbCount: number;
  providerCount: number;
  missing: number;
  extra: number;
  mismatch: number;
  ok: number;
}

export interface GenericSyncPageProps<
  TUnified,
  TDbData = unknown,
  TProviderData = unknown,
> {
  /** Label for toasts, e.g. "Country" */
  entityLabel: string;
  /** React Query key prefix, e.g. "countries" */
  queryKeyPrefix: string;
  /** Batch name filter, e.g. "seed-countries" */
  batchName: string;

  // Data hooks results
  dbData: TDbData;
  dbLoading: boolean;
  dbFetching: boolean;
  dbError: Error | null;
  providerData: TProviderData;
  providerLoading: boolean;
  providerFetching: boolean;
  providerError: Error | null;
  batchesData: AdminBatchesListResponse | undefined;
  batchesLoading: boolean;

  // Unification
  unifiedData: TUnified[];
  diffStats: DiffStats;

  // Sync
  syncById: (externalId: string) => Promise<void>;

  // Table component
  renderTable: (props: {
    mode: ViewMode;
    unifiedData: TUnified[];
    diffFilter: DiffFilter;
    onDiffFilterChange: (f: DiffFilter) => void;
    dbData: TDbData;
    providerData: TProviderData;
    isLoading: boolean;
    error: Error | null;
    onSync?: (externalId: string) => Promise<void>;
  }) => React.ReactNode;

  /** Optional extra summary items */
  extraSummary?: React.ReactNode;
  /** Optional filter children (for fixtures/odds) */
  children?: React.ReactNode;
}

export function GenericSyncPage<
  TUnified,
  TDbData = unknown,
  TProviderData = unknown,
>({
  dbData,
  dbLoading,
  dbFetching,
  dbError,
  providerData,
  providerLoading,
  providerFetching,
  providerError,
  batchesData,
  batchesLoading,
  unifiedData,
  diffStats,
  syncById,
  renderTable,
}: GenericSyncPageProps<TUnified, TDbData, TProviderData>) {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");

  const isLoading = dbLoading || providerLoading;
  const isFetching = dbFetching || providerFetching;
  const hasError = dbError || providerError;
  const isPartialData = Boolean(
    (dbData && !providerData) || (!dbData && providerData)
  );

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-3 sm:p-4 md:p-6">
      <div className="flex-shrink-0 space-y-2 mb-3 sm:mb-4">
        <PageFilters />

        {isPartialData && (
          <div className="border-b pb-2 text-xs text-muted-foreground">
            {!providerData
              ? "Provider data unavailable"
              : "Database data unavailable"}
          </div>
        )}
        {hasError && !isPartialData && (
          <div className="border-b pb-2 text-xs text-destructive">
            {dbError ? "DB failed to load" : "Provider failed to load"}
          </div>
        )}

        <Tabs
          value={viewMode}
          onValueChange={(v) =>
            !isFetching && setViewMode(v as ViewMode | "history")
          }
        >
          <TabsList>
            <TabsTrigger value="provider" disabled={isFetching}>
              Provider
            </TabsTrigger>
            <TabsTrigger value="db" disabled={isFetching}>
              DB
            </TabsTrigger>
            <TabsTrigger value="history" disabled={isFetching}>
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-2 py-2 sm:py-1">
          <div className="flex items-center gap-3 sm:gap-4 text-xs pb-1 min-w-max">
            {isFetching ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))
            ) : (
              <>
                <span className="text-muted-foreground">
                  DB: <span className="text-foreground">{diffStats.dbCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Provider:{" "}
                  <span className="text-foreground">
                    {diffStats.providerCount}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline cursor-pointer"
                  onClick={() => setDiffFilter("missing")}
                >
                  Missing:{" "}
                  <span className="text-foreground">{diffStats.missing}</span>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline cursor-pointer"
                  onClick={() => setDiffFilter("extra")}
                >
                  Extra:{" "}
                  <span className="text-foreground">{diffStats.extra}</span>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline cursor-pointer"
                  onClick={() => setDiffFilter("mismatch")}
                >
                  Mismatch:{" "}
                  <span className="text-foreground">{diffStats.mismatch}</span>
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:underline cursor-pointer"
                  onClick={() => setDiffFilter("ok")}
                >
                  OK: <span className="text-foreground">{diffStats.ok}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "history" ? (
          <BatchesTable
            batches={batchesData?.data || []}
            isLoading={batchesLoading}
          />
        ) : (
          renderTable({
            mode: viewMode,
            unifiedData,
            diffFilter,
            onDiffFilterChange: setDiffFilter,
            dbData,
            providerData,
            isLoading: viewMode === "db" ? dbLoading : isLoading,
            error: viewMode === "db" ? dbError : null,
            onSync: viewMode === "provider" ? syncById : undefined,
          })
        )}
      </div>
    </div>
  );
}
