import { apiGet, apiPost } from "@/lib/api";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@/types/api";

export const countriesService = {
  async getFromDb(params?: {
    page?: number;
    perPage?: number;
    include?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.perPage)
      searchParams.append("perPage", params.perPage.toString());
    if (params?.include) searchParams.append("include", params.include);

    const queryString = searchParams.toString();
    // Try /admin/db/countries first (based on directory structure)
    const url = `/admin/db/countries${queryString ? `?${queryString}` : ""}`;
    return apiGet<AdminCountriesListResponse>(url);
  },

  async getFromProvider() {
    // Try /admin/provider/countries first (based on directory structure)
    return apiGet<AdminProviderCountriesResponse>("/admin/provider/countries");
  },

  async sync(dryRun = false) {
    return apiPost("/admin/sync/countries", { dryRun });
  },

  async syncById(id: number | string, dryRun = false) {
    return apiPost(`/admin/sync/countries/${id}`, { dryRun });
  },
};
