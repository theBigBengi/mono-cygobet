import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/lib/adminApi";
import type {
  AdminBadgeDefinitionsListResponse,
  AdminCreateBadgeDefinitionBody,
  AdminCreateBadgeDefinitionResponse,
  AdminUpdateBadgeDefinitionBody,
  AdminUpdateBadgeDefinitionResponse,
  AdminDeleteBadgeDefinitionResponse,
  AdminBadgeDefinitionSearchResponse,
} from "@repo/types";

export const badgesService = {
  async list(params?: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<AdminBadgeDefinitionsListResponse> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.perPage) qs.set("perPage", String(params.perPage));
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString();
    return apiGet<AdminBadgeDefinitionsListResponse>(
      `/admin/badges${query ? `?${query}` : ""}`
    );
  },

  async create(
    body: AdminCreateBadgeDefinitionBody
  ): Promise<AdminCreateBadgeDefinitionResponse> {
    return apiPost<AdminCreateBadgeDefinitionResponse>("/admin/badges", body);
  },

  async update(
    id: number,
    body: AdminUpdateBadgeDefinitionBody
  ): Promise<AdminUpdateBadgeDefinitionResponse> {
    return apiPatch<AdminUpdateBadgeDefinitionResponse>(
      `/admin/badges/${id}`,
      body
    );
  },

  async delete(id: number): Promise<AdminDeleteBadgeDefinitionResponse> {
    return apiDelete<AdminDeleteBadgeDefinitionResponse>(
      `/admin/badges/${id}`
    );
  },

  async search(q: string): Promise<AdminBadgeDefinitionSearchResponse> {
    return apiGet<AdminBadgeDefinitionSearchResponse>(
      `/admin/badges/search?q=${encodeURIComponent(q)}`
    );
  },

  async uploadImage(
    file: File
  ): Promise<{ status: string; data: { url: string }; message: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload("/admin/upload/badge-image", formData);
  },
};
