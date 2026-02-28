import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/lib/adminApi";
import type {
  AdminOfficialGroupsListResponse,
  AdminCreateOfficialGroupBody,
  AdminCreateOfficialGroupResponse,
  AdminUpdateOfficialGroupBody,
  AdminUpdateOfficialGroupResponse,
  AdminDeleteOfficialGroupResponse,
  AdminAwardBadgesResponse,
  AdminOfficialGroupFixturesResponse,
  AdminOfficialGroupLeaderboardResponse,
  AdminOfficialGroupDetailsResponse,
  AdminUpdateOfficialGroupRulesBody,
  AdminUpdateOfficialGroupRulesResponse,
  AdminOfficialGroupFixturePredictionsResponse,
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

  async getDetails(
    id: number
  ): Promise<AdminOfficialGroupDetailsResponse> {
    return apiGet<AdminOfficialGroupDetailsResponse>(
      `/admin/official-groups/${id}/details`
    );
  },

  async updateRules(
    id: number,
    body: AdminUpdateOfficialGroupRulesBody
  ): Promise<AdminUpdateOfficialGroupRulesResponse> {
    return apiPatch<AdminUpdateOfficialGroupRulesResponse>(
      `/admin/official-groups/${id}/rules`,
      body
    );
  },

  async getLeaderboard(
    id: number,
    page = 1,
    perPage = 20
  ): Promise<AdminOfficialGroupLeaderboardResponse> {
    return apiGet<AdminOfficialGroupLeaderboardResponse>(
      `/admin/official-groups/${id}/leaderboard?page=${page}&perPage=${perPage}`
    );
  },

  async getFixtures(
    id: number,
    page = 1,
    perPage = 20
  ): Promise<AdminOfficialGroupFixturesResponse> {
    return apiGet<AdminOfficialGroupFixturesResponse>(
      `/admin/official-groups/${id}/fixtures?page=${page}&perPage=${perPage}`
    );
  },

  async getFixturePredictions(
    groupId: number,
    groupFixtureId: number
  ): Promise<AdminOfficialGroupFixturePredictionsResponse> {
    return apiGet<AdminOfficialGroupFixturePredictionsResponse>(
      `/admin/official-groups/${groupId}/fixtures/${groupFixtureId}/predictions`
    );
  },

  async awardBadges(id: number): Promise<AdminAwardBadgesResponse> {
    return apiPost<AdminAwardBadgesResponse>(
      `/admin/official-groups/${id}/award-badges`
    );
  },

  async awardSingleBadge(
    groupId: number,
    badgeId: number
  ): Promise<AdminAwardBadgesResponse> {
    return apiPost<AdminAwardBadgesResponse>(
      `/admin/official-groups/${groupId}/badges/${badgeId}/award`
    );
  },

  async uploadBadgeImage(
    file: File
  ): Promise<{ status: string; data: { url: string }; message: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload("/admin/upload/badge-image", formData);
  },
};
