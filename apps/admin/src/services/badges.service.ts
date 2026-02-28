import { apiGet, apiPatch, apiPost, apiUpload } from "@/lib/adminApi";
import type {
  AdminBadgesListResponse,
  AdminUpdateBadgeBody,
  AdminUpdateBadgeResponse,
  AdminBadgeEarnedListResponse,
  AdminAwardBadgesResponse,
} from "@repo/types";

export const badgesService = {
  async list(params?: {
    page?: number;
    perPage?: number;
    search?: string;
    criteriaType?: string;
    groupId?: number;
  }): Promise<AdminBadgesListResponse> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.perPage) qs.set("perPage", String(params.perPage));
    if (params?.search) qs.set("search", params.search);
    if (params?.criteriaType) qs.set("criteriaType", params.criteriaType);
    if (params?.groupId) qs.set("groupId", String(params.groupId));
    const query = qs.toString();
    return apiGet<AdminBadgesListResponse>(
      `/admin/badges${query ? `?${query}` : ""}`
    );
  },

  async update(
    badgeId: number,
    body: AdminUpdateBadgeBody
  ): Promise<AdminUpdateBadgeResponse> {
    return apiPatch<AdminUpdateBadgeResponse>(`/admin/badges/${badgeId}`, body);
  },

  async listEarned(
    badgeId: number,
    page = 1,
    perPage = 20
  ): Promise<AdminBadgeEarnedListResponse> {
    return apiGet<AdminBadgeEarnedListResponse>(
      `/admin/badges/${badgeId}/earned?page=${page}&perPage=${perPage}`
    );
  },

  async award(badgeId: number): Promise<AdminAwardBadgesResponse> {
    return apiPost<AdminAwardBadgesResponse>(`/admin/badges/${badgeId}/award`);
  },

  async uploadImage(
    file: File
  ): Promise<{ status: string; data: { url: string }; message: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload("/admin/upload/badge-image", formData);
  },
};
