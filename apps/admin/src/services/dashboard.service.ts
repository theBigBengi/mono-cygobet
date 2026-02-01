import { apiGet } from "@/lib/adminApi";
import type { AdminDashboardResponse } from "@repo/types";

export type { AdminDashboardResponse as DashboardResponse };

export const dashboardService = {
  async getDashboard(): Promise<AdminDashboardResponse> {
    return apiGet<AdminDashboardResponse>("/admin/dashboard");
  },
};
