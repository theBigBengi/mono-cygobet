import { apiGet, apiPatch, apiPost } from "@/lib/adminApi";
import type {
  AdminBatchItemsResponse,
  AdminJobDetailResponse,
  AdminJobRunResponse,
  AdminJobsListResponse,
  AdminJobRunsListResponse,
  AdminRunAllJobsResponse,
  AdminRunJobResponse,
  AdminUpdateJobResponse,
} from "@repo/types";

export type GetJobRunsParams = {
  jobId?: string;
  status?: string;
  limit?: number;
  cursor?: number | null;
  search?: string;
};

export type GetJobRunsForJobParams = {
  limit?: number;
  cursor?: number | null;
  status?: string;
};

export type GetRunItemsParams = {
  page?: number;
  perPage?: number;
  status?: string;
  action?: string;
  search?: string;
};

export const jobsService = {
  async getJobs(): Promise<AdminJobsListResponse> {
    return apiGet<AdminJobsListResponse>("/admin/jobs");
  },

  async getJob(jobKey: string): Promise<AdminJobDetailResponse> {
    return apiGet<AdminJobDetailResponse>(
      `/admin/jobs/${encodeURIComponent(jobKey)}`
    );
  },

  async getRun(runId: number): Promise<AdminJobRunResponse> {
    return apiGet<AdminJobRunResponse>(`/admin/jobs/runs/${runId}`);
  },

  async getJobRuns(
    jobKey: string,
    params: GetJobRunsForJobParams = {}
  ): Promise<AdminJobRunsListResponse> {
    const sp = new URLSearchParams();
    if (typeof params.limit === "number") sp.set("limit", String(params.limit));
    if (typeof params.cursor === "number")
      sp.set("cursor", String(params.cursor));
    if (params.status) sp.set("status", params.status);
    const qs = sp.toString();
    return apiGet<AdminJobRunsListResponse>(
      `/admin/jobs/${encodeURIComponent(jobKey)}/runs${qs ? `?${qs}` : ""}`
    );
  },

  async getRunItems(
    runId: number,
    params: GetRunItemsParams = {}
  ): Promise<AdminBatchItemsResponse> {
    const sp = new URLSearchParams();
    if (typeof params.page === "number") sp.set("page", String(params.page));
    if (typeof params.perPage === "number")
      sp.set("perPage", String(params.perPage));
    if (params.status) sp.set("status", params.status);
    if (params.action) sp.set("action", params.action);
    if (params.search) sp.set("search", params.search);
    const qs = sp.toString();
    return apiGet<AdminBatchItemsResponse>(
      `/admin/jobs/runs/${runId}/items${qs ? `?${qs}` : ""}`
    );
  },

  async getRuns(
    params: GetJobRunsParams = {}
  ): Promise<AdminJobRunsListResponse> {
    const sp = new URLSearchParams();
    if (params.jobId) sp.set("jobId", params.jobId);
    if (params.status) sp.set("status", params.status);
    if (typeof params.limit === "number") sp.set("limit", String(params.limit));
    if (typeof params.cursor === "number")
      sp.set("cursor", String(params.cursor));
    if (params.search) sp.set("search", params.search);

    const qs = sp.toString();
    return apiGet<AdminJobRunsListResponse>(
      `/admin/jobs/runs${qs ? `?${qs}` : ""}`
    );
  },

  async runJob(jobId: string, dryRun = false): Promise<AdminRunJobResponse> {
    return apiPost<AdminRunJobResponse>(
      `/admin/jobs/${encodeURIComponent(jobId)}/run`,
      {
        dryRun,
      }
    );
  },

  async runAll(dryRun = false): Promise<AdminRunAllJobsResponse> {
    return apiPost<AdminRunAllJobsResponse>("/admin/jobs/run-all", { dryRun });
  },

  async updateJob(
    jobId: string,
    patch: {
      description?: string | null;
      enabled?: boolean;
      scheduleCron?: string | null;
      meta?: Record<string, unknown> | null;
    }
  ): Promise<AdminUpdateJobResponse> {
    return apiPatch<AdminUpdateJobResponse>(
      `/admin/jobs/${encodeURIComponent(jobId)}`,
      patch
    );
  },
};
