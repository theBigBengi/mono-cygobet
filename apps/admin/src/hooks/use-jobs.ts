import { useQuery } from "@tanstack/react-query";
import { jobsService, type GetJobRunsParams } from "@/services/jobs.service";
import type { AdminJobsListResponse, AdminJobRunsListResponse } from "@repo/types";

export function useJobsFromDb() {
  return useQuery<AdminJobsListResponse>({
    queryKey: ["jobs", "db"],
    queryFn: () => jobsService.getJobs(),
    staleTime: 30000,
  });
}

export function useJobRunsFromDb(params: GetJobRunsParams) {
  return useQuery<AdminJobRunsListResponse>({
    queryKey: ["job-runs", params],
    queryFn: () => jobsService.getRuns(params),
    staleTime: 15000,
  });
}


