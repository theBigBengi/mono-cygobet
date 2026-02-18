import { apiGet, apiPost } from "@/lib/adminApi";
import type {
  AdminDashboardResponse,
  AdminAlertsListResponse,
  AdminAlertResolveResponse,
} from "@repo/types";

export const dashboardService = {
  async getDashboard(): Promise<AdminDashboardResponse> {
    return apiGet<AdminDashboardResponse>("/admin/dashboard");
  },

  async getAlerts(): Promise<AdminAlertsListResponse> {
    return apiGet<AdminAlertsListResponse>("/admin/alerts");
  },

  async getAlertHistory(limit = 50): Promise<AdminAlertsListResponse> {
    return apiGet<AdminAlertsListResponse>(`/admin/alerts/history?limit=${limit}`);
  },

  async resolveAlert(id: number): Promise<AdminAlertResolveResponse> {
    return apiPost<AdminAlertResolveResponse>(`/admin/alerts/${id}/resolve`);
  },
};
