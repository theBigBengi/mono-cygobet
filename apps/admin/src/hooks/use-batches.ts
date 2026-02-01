import { useQuery } from "@tanstack/react-query";
import { batchesService } from "@/services/batches.service";
import type {
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export function useBatches(name?: string, limit = 20) {
  return useQuery<AdminBatchesListResponse>({
    queryKey: ["batches", name, limit],
    queryFn: () =>
      name
        ? batchesService.getBatchesByName(name, limit)
        : batchesService.getAllBatches(limit),
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
    queryFn: () => batchesService.getBatchItems(batchId!, page, perPage),
    enabled: batchId !== null,
    staleTime: 30000, // 30 seconds
  });
}
