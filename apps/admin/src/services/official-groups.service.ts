import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/adminApi";
import type {
  AdminOfficialGroupsListResponse,
  AdminCreateOfficialGroupBody,
  AdminCreateOfficialGroupResponse,
  AdminUpdateOfficialGroupBody,
  AdminUpdateOfficialGroupResponse,
  AdminDeleteOfficialGroupResponse,
  AdminAwardBadgesResponse,
} from "@repo/types";

export const officialGroupsService = {
  async list(
    page = 1,
    perPage = 20
  ): Promise<AdminOfficialGroupsListResponse> {
    return apiGet<AdminOfficialGroupsListResponse>(
      `/admin/official-groups?page=${page}&perPage=${perPage}`
    );
  },

  async get(id: number): Promise<AdminCreateOfficialGroupResponse> {
    return apiGet<AdminCreateOfficialGroupResponse>(
      `/admin/official-groups/${id}`
    );
  },

  async create(
    body: AdminCreateOfficialGroupBody
  ): Promise<AdminCreateOfficialGroupResponse> {
    return apiPost<AdminCreateOfficialGroupResponse>(
      "/admin/official-groups",
      body
    );
  },

  async update(
    id: number,
    body: AdminUpdateOfficialGroupBody
  ): Promise<AdminUpdateOfficialGroupResponse> {
    return apiPatch<AdminUpdateOfficialGroupResponse>(
      `/admin/official-groups/${id}`,
      body
    );
  },

  async delete(id: number): Promise<AdminDeleteOfficialGroupResponse> {
    return apiDelete<AdminDeleteOfficialGroupResponse>(
      `/admin/official-groups/${id}`
    );
  },

  async awardBadges(id: number): Promise<AdminAwardBadgesResponse> {
    return apiPost<AdminAwardBadgesResponse>(
      `/admin/official-groups/${id}/award-badges`
    );
  },
};
