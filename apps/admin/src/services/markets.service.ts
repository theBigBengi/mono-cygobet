import { apiGet } from "@/lib/api";
import type { AdminProviderMarketsResponse } from "@repo/types";

export const marketsService = {
  async getFromProvider() {
    return apiGet<AdminProviderMarketsResponse>("/admin/provider/markets");
  },
};

