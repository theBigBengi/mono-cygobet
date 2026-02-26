import { apiGet } from "@/lib/adminApi";
import type {
  AdminAuditLogListResponse,
  AdminAuditLogFilterOptionsResponse,
} from "@repo/types";

export type AuditLogFilters = {
  search?: string;
  category?: string;
  action?: string;
  actorId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
};

export const auditLogService = {
  async getLogs(filters: AuditLogFilters = {}): Promise<AdminAuditLogListResponse> {
    const sp = new URLSearchParams();
    if (filters.search) sp.set("search", filters.search);
    if (filters.category) sp.set("category", filters.category);
    if (filters.action) sp.set("action", filters.action);
    if (filters.actorId) sp.set("actorId", String(filters.actorId));
    if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) sp.set("dateTo", filters.dateTo);
    if (typeof filters.page === "number") sp.set("page", String(filters.page));
    if (typeof filters.perPage === "number") sp.set("perPage", String(filters.perPage));
    const qs = sp.toString();
    return apiGet<AdminAuditLogListResponse>(
      `/admin/audit-log${qs ? `?${qs}` : ""}`
    );
  },

  async getFilterOptions(): Promise<AdminAuditLogFilterOptionsResponse> {
    return apiGet<AdminAuditLogFilterOptionsResponse>(
      "/admin/audit-log/filter-options"
    );
  },
};
