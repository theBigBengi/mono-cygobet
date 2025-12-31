import { useQuery } from "@tanstack/react-query";
import { countriesService } from "@/services/countries.service";
import type {
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@/types/api";

export function useBatches(name?: string, limit = 20) {
  return useQuery<AdminBatchesListResponse>({
    queryKey: ["batches", name, limit],
    queryFn: () => countriesService.getBatches(name, limit),
    staleTime: 30000, // 30 seconds
  });
}

export function useBatchItems(
  batchId: number | null,
  page = 1,
  perPage = 50
) {
  return useQuery<AdminBatchItemsResponse>({
    queryKey: ["batch-items", batchId, page, perPage],
    queryFn: () => countriesService.getBatchItems(batchId!, page, perPage),
    enabled: batchId !== null,
    staleTime: 30000, // 30 seconds
  });
}

