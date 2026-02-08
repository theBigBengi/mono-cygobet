import { useQuery } from "@tanstack/react-query";
import { batchesService } from "@/services/batches.service";
import type {
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export function useBatches(
  name?: string,
  limit = 20,
  options?: { enabled?: boolean }
) {
  return useQuery<AdminBatchesListResponse>({
    queryKey: ["batches", name, limit],
    queryFn: () =>
      name
        ? batchesService.getBatchesByName(name, limit)
        : batchesService.getAllBatches(limit),
    staleTime: 30000, // 30 seconds
    enabled: options?.enabled ?? true,
  });
}

export interface UseBatchItemsOpts {
  page?: number;
  perPage?: number;
  status?: "failed" | "success" | "queued" | "running" | "skipped";
  action?: string;
  enabled?: boolean;
}

export function useBatchItems(
  batchId: number | null,
  opts: UseBatchItemsOpts = {}
) {
  const { page = 1, perPage = 50, status, action, enabled = true } = opts;

  return useQuery<AdminBatchItemsResponse>({
    queryKey: ["batch-items", batchId, page, perPage, status, action],
    queryFn: () =>
      batchesService.getBatchItems(batchId!, page, perPage, {
        status,
        action,
      }),
    enabled: enabled && batchId !== null,
    staleTime: 30000, // 30 seconds
  });
}

/** Fetches only failed items for a batch (for error detail view). Pass enabled: true when the user expands the failed items list to avoid unnecessary fetches. */
export function useBatchFailedItems(
  batchId: number | null,
  options?: { enabled?: boolean }
) {
  return useBatchItems(batchId, {
    page: 1,
    perPage: 100,
    status: "failed",
    enabled: options?.enabled ?? true,
  });
}
