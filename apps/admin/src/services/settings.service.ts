import { apiGet, apiPatch } from "@/lib/adminApi";
import type {
  AdminNotificationSettings,
  AdminNotificationSettingsResponse,
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
};
