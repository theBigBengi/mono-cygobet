import { apiGet } from "@/lib/adminApi";
import type {
  AdminBatchesListResponse,
  AdminBatchItemsResponse,
} from "@repo/types";

export const batchesService = {
  async getAllBatches(limit = 50) {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    return apiGet<AdminBatchesListResponse>(
      `/admin/sync-center/db/batches?${params.toString()}`
    );
  },

  async getBatchesByName(name: string, limit = 20) {
    const params = new URLSearchParams();
    params.append("name", name);
    params.append("limit", limit.toString());
    return apiGet<AdminBatchesListResponse>(
      `/admin/sync-center/db/batches?${params.toString()}`
    );
  },

  async getBatchItems(
    batchId: number,
    page = 1,
    perPage = 50,
    options?: {
      status?: "failed" | "success" | "queued" | "running" | "skipped";
      action?: string;
    }
  ) {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("perPage", String(perPage));
    if (options?.status) params.append("status", options.status);
    if (options?.action) params.append("action", options.action);
    return apiGet<AdminBatchItemsResponse>(
      `/admin/sync-center/db/batches/${batchId}/items?${params.toString()}`
    );
  },
};
