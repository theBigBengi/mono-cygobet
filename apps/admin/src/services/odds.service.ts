import { apiGet } from "@/lib/adminApi";
import type { AdminOddsListResponse, AdminProviderOddsResponse } from "@repo/types";

export const oddsService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    fixtureIds?: string[];
    bookmakerIds?: string[];
    marketIds?: string[];
    winning?: boolean;
    fromTs?: number;
    toTs?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage) searchParams.append("perPage", params.perPage.toString());
    if (params?.fixtureIds?.length) searchParams.append("fixtureIds", params.fixtureIds.join(","));
    if (params?.bookmakerIds?.length) searchParams.append("bookmakerIds", params.bookmakerIds.join(","));
    if (params?.marketIds?.length) searchParams.append("marketIds", params.marketIds.join(","));
    if (params?.winning !== undefined) searchParams.append("winning", String(params.winning));
    if (params?.fromTs !== undefined) searchParams.append("fromTs", String(params.fromTs));
    if (params?.toTs !== undefined) searchParams.append("toTs", String(params.toTs));

    const qs = searchParams.toString();
    const url = `/admin/sync-center/db/odds${qs ? `?${qs}` : ""}`;
    return apiGet<AdminOddsListResponse>(url);
  },

  async getFromProvider(params?: {
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    bookmakerIds?: string[]; // external IDs
    marketIds?: string[]; // external IDs
    fixtureStates?: string[]; // sportmonks fixture states, defaults to ["1"]
  }) {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append("from", params.from);
    if (params?.to) searchParams.append("to", params.to);
    if (params?.bookmakerIds?.length)
      searchParams.append("bookmakerIds", params.bookmakerIds.join(","));
    if (params?.marketIds?.length)
      searchParams.append("marketIds", params.marketIds.join(","));
    if (params?.fixtureStates?.length)
      searchParams.append("fixtureStates", params.fixtureStates.join(","));

    const qs = searchParams.toString();
    const url = `/admin/sync-center/provider/odds${qs ? `?${qs}` : ""}`;
    return apiGet<AdminProviderOddsResponse>(url);
  },
};

