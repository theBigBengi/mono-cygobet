import { apiGet, apiPatch, apiPut } from "@/lib/adminApi";
import type {
  AdminNotificationSettings,
  AdminNotificationSettingsResponse,
  AdminLeagueOrderSettingsResponse,
  AdminTeamOrderSettingsResponse,
} from "@repo/types";

export const settingsService = {
  async getNotificationSettings(): Promise<AdminNotificationSettingsResponse> {
    return apiGet<AdminNotificationSettingsResponse>(
      "/admin/settings/notifications"
    );
  },

  async updateNotificationSettings(
    data: Partial<AdminNotificationSettings>
  ): Promise<AdminNotificationSettingsResponse> {
    return apiPatch<AdminNotificationSettingsResponse>(
      "/admin/settings/notifications",
      data
    );
  },

  async getLeagueOrderSettings(): Promise<AdminLeagueOrderSettingsResponse> {
    return apiGet<AdminLeagueOrderSettingsResponse>(
      "/admin/settings/league-order"
    );
  },

  async updateLeagueOrderSettings(
    leagueIds: number[]
  ): Promise<AdminLeagueOrderSettingsResponse> {
    return apiPut<AdminLeagueOrderSettingsResponse>(
      "/admin/settings/league-order",
      { leagueIds }
    );
  },

  async getTeamOrderSettings(): Promise<AdminTeamOrderSettingsResponse> {
    return apiGet<AdminTeamOrderSettingsResponse>(
      "/admin/settings/team-order"
    );
  },

  async updateTeamOrderSettings(
    teamIds: number[]
  ): Promise<AdminTeamOrderSettingsResponse> {
    return apiPut<AdminTeamOrderSettingsResponse>(
      "/admin/settings/team-order",
      { teamIds }
    );
  },
};
