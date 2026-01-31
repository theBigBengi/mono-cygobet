import { useMemo, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useBookmakersFromDb,
  useBookmakersFromProvider,
} from "@/hooks/use-bookmakers";
import { useBatches } from "@/hooks/use-batches";
import { bookmakersService } from "@/services/bookmakers.service";
import { unifyBookmakers, calculateDiffStats } from "@/utils/bookmakers";
import { BookmakersTable } from "@/components/bookmakers/bookmakers-table";
import { GenericSyncPage } from "./generic-sync-page";
import type {
  AdminSyncBookmakersResponse,
  AdminBookmakersListResponse,
  AdminProviderBookmakersResponse,
} from "@repo/types";

export default function BookmakersPage() {
  const queryClient = useQueryClient();
  const [dbPage, setDbPage] = useState(1);
  const [dbPageSize, setDbPageSize] = useState(25);

  const { data: dbData, isLoading: dbLoading, isFetching: dbFetching, error: dbError } =
    useBookmakersFromDb({ perPage: 1000 });
  const { data: dbDataPage, isLoading: dbTabLoading } = useBookmakersFromDb({
    page: dbPage,
    perPage: dbPageSize,
  });
  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useBookmakersFromProvider();
  const { data: batchesData, isLoading: batchesLoading } =
    useBatches("seed-bookmakers", 20);

  const unifiedData = useMemo(
    () => unifyBookmakers(dbData, providerData),
    [dbData, providerData]
  );
  const diffStats = useMemo(() => calculateDiffStats(unifiedData), [unifiedData]);

  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      bookmakersService.syncById(id, false) as Promise<AdminSyncBookmakersResponse>,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["bookmakers", "db"] });
      toast.success("Bookmaker synced", {
        description: `${vars.name} synced.`,
      });
    },
    onError: (err: Error, vars) => {
      toast.error("Sync failed", {
        description: `${vars.name}: ${err.message}`,
      });
    },
  });

  const syncById = useCallback(
    async (externalId: string) => {
      const bookmaker = unifiedData.find((b) => b.externalId === externalId);
      await syncMutation.mutateAsync({
        id: externalId,
        name: bookmaker?.name || externalId,
      });
    },
    [syncMutation, unifiedData]
  );

  return (
    <GenericSyncPage<
      import("@/types").UnifiedBookmaker,
      AdminBookmakersListResponse | undefined,
      AdminProviderBookmakersResponse | undefined
    >
      entityLabel="Bookmaker"
      queryKeyPrefix="bookmakers"
      batchName="seed-bookmakers"
      dbData={dbData}
      dbLoading={dbLoading}
      dbFetching={dbFetching}
      dbError={dbError as Error | null}
      providerData={providerData}
      providerLoading={providerLoading}
      providerFetching={providerFetching}
      providerError={providerError as Error | null}
      batchesData={batchesData}
      batchesLoading={batchesLoading}
      unifiedData={unifiedData}
      diffStats={diffStats}
      syncById={syncById}
      dbDataPaginated={dbDataPage}
      dbPagination={
        dbDataPage?.pagination
          ? {
              page: dbDataPage.pagination.page,
              perPage: dbDataPage.pagination.perPage,
              totalItems: dbDataPage.pagination.totalItems,
              totalPages: dbDataPage.pagination.totalPages,
            }
          : undefined
      }
      onDbPageChange={setDbPage}
      onDbPageSizeChange={(size) => {
        setDbPageSize(size);
        setDbPage(1);
      }}
      dbTabLoading={dbTabLoading}
      renderTable={(props) => (
        <BookmakersTable
          mode={props.mode}
          unifiedData={props.unifiedData}
          diffFilter={props.diffFilter}
          onDiffFilterChange={props.onDiffFilterChange}
          dbData={props.dbData}
          providerData={props.providerData}
          isLoading={props.isLoading}
          error={props.error}
          onSyncBookmaker={props.onSync}
          dbPagination={props.dbPagination}
          onDbPageChange={props.onDbPageChange}
          onDbPageSizeChange={props.onDbPageSizeChange}
        />
      )}
    />
  );
}
