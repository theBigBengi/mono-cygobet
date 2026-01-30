import { useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCountriesFromDb, useCountriesFromProvider } from "@/hooks/use-countries";
import { useBatches } from "@/hooks/use-batches";
import { countriesService } from "@/services/countries.service";
import { unifyCountries, calculateDiffStats } from "@/utils/countries";
import { CountriesTable } from "@/components/countries/countries-table";
import { GenericSyncPage } from "./generic-sync-page";
import type {
  AdminSyncCountriesResponse,
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@repo/types";

export default function CountriesPage() {
  const queryClient = useQueryClient();

  const { data: dbData, isLoading: dbLoading, isFetching: dbFetching, error: dbError } =
    useCountriesFromDb({ perPage: 1000, include: "leagues" });
  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useCountriesFromProvider();
  const { data: batchesData, isLoading: batchesLoading } =
    useBatches("seed-countries", 20);

  const unifiedData = useMemo(
    () => unifyCountries(dbData, providerData),
    [dbData, providerData]
  );
  const diffStats = useMemo(() => calculateDiffStats(unifiedData), [unifiedData]);

  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      countriesService.syncById(id, false) as Promise<AdminSyncCountriesResponse>,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["countries", "db"] });
      toast.success("Country synced", {
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
      const country = unifiedData.find((c) => c.externalId === externalId);
      await syncMutation.mutateAsync({
        id: externalId,
        name: country?.name || externalId,
      });
    },
    [syncMutation, unifiedData]
  );

  return (
    <GenericSyncPage<
      import("@/types").UnifiedCountry,
      AdminCountriesListResponse | undefined,
      AdminProviderCountriesResponse | undefined
    >
      entityLabel="Country"
      queryKeyPrefix="countries"
      batchName="seed-countries"
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
      renderTable={(props) => (
        <CountriesTable
          mode={props.mode}
          unifiedData={props.unifiedData}
          diffFilter={props.diffFilter}
          onDiffFilterChange={props.onDiffFilterChange}
          dbData={props.dbData}
          providerData={props.providerData}
          isLoading={props.isLoading}
          error={props.error}
          onSyncCountry={props.onSync}
        />
      )}
    />
  );
}
