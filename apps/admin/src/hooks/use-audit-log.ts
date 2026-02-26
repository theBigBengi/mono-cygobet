import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  auditLogService,
  type AuditLogFilters,
} from "@/services/audit-log.service";
import type {
  AdminAuditLogListResponse,
  AdminAuditLogFilterOptionsResponse,
} from "@repo/types";

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<AdminAuditLogListResponse>({
    queryKey: ["audit-log", filters],
    queryFn: () => auditLogService.getLogs(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAuditLogFilterOptions() {
  return useQuery<AdminAuditLogFilterOptionsResponse>({
    queryKey: ["audit-log", "filter-options"],
    queryFn: () => auditLogService.getFilterOptions(),
    staleTime: 5 * 60_000,
  });
}
