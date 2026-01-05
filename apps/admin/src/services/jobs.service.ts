import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
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
};

export const jobsService = {
  async getJobs(): Promise<AdminJobsListResponse> {
    return apiGet<AdminJobsListResponse>("/admin/jobs");
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
