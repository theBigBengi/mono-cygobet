import { apiGet } from "@/lib/adminApi";
import type { AdminProviderMarketsResponse } from "@repo/types";

export const marketsService = {
  async getFromProvider() {
    return apiGet<AdminProviderMarketsResponse>("/admin/sync-center/provider/markets");
  },
};

