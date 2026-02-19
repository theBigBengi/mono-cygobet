import { useQuery } from "@tanstack/react-query";
import {
  jobsService,
  type GetJobRunsParams,
  type GetJobRunsForJobParams,
  type GetRunItemsParams,
} from "@/services/jobs.service";
import type {
  AdminBatchItemsResponse,
  AdminJobDetailResponse,
  AdminJobRunResponse,
  AdminJobsListResponse,
  AdminJobRunsListResponse,
} from "@repo/types";

export function useJobsFromDb() {
  return useQuery<AdminJobsListResponse>({
    queryKey: ["jobs", "db"],
    queryFn: () => jobsService.getJobs(),
    staleTime: Infinity,
  });
}

export function useJobFromDb(jobKey: string | null) {
  return useQuery<AdminJobDetailResponse>({
    queryKey: ["jobs", "db", jobKey],
    queryFn: () => jobsService.getJob(jobKey!),
    enabled: !!jobKey,
    staleTime: Infinity,
  });
}

export function useJobRunsFromDb(params: GetJobRunsParams) {
  return useQuery<AdminJobRunsListResponse>({
    queryKey: ["job-runs", params],
    queryFn: () => jobsService.getRuns(params),
    staleTime: Infinity,
  });
}

export function useJobRunsForJob(
  jobKey: string | null,
  params: GetJobRunsForJobParams = {}
) {
  return useQuery<AdminJobRunsListResponse>({
    queryKey: ["job-runs", jobKey, params],
    queryFn: () => jobsService.getJobRuns(jobKey!, params),
    enabled: !!jobKey,
    staleTime: Infinity,
  });
}

export function useRun(runId: number | null) {
  return useQuery<AdminJobRunResponse>({
    queryKey: ["job-run", runId],
    queryFn: () => jobsService.getRun(runId!),
    enabled: runId != null && Number.isFinite(runId),
    staleTime: Infinity,
  });
}

export function useRunItems(
  runId: number | null,
  params: GetRunItemsParams = {}
) {
  return useQuery<AdminBatchItemsResponse>({
    queryKey: ["run-items", runId, params],
    queryFn: () => jobsService.getRunItems(runId!, params),
    enabled: runId != null && Number.isFinite(runId),
    staleTime: Infinity,
  });
}


