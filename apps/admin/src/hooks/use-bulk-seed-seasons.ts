import { useState, useEffect, useRef, useCallback } from "react";
import { syncService } from "@/services/sync.service";
import type { BatchSeedSeasonResult } from "@repo/types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // ~10 minutes
const MAX_CONSECUTIVE_ERRORS = 5;

type BatchStatus = "idle" | "starting" | "processing" | "completed" | "failed";

interface BulkSeedState {
  status: BatchStatus;
  jobId: string | null;
  totalSeasons: number;
  completedSeasons: number;
  failedSeasons: number;
  progress: number;
  seasons: BatchSeedSeasonResult[];
  error: string | null;
}

export function useBulkSeedSeasons() {
  const [state, setState] = useState<BulkSeedState>({
    status: "idle",
    jobId: null,
    totalSeasons: 0,
    completedSeasons: 0,
    failedSeasons: 0,
    progress: 0,
    seasons: [],
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const errorCountRef = useRef(0);
  const doneRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!state.jobId || state.status !== "processing") return;

    const currentJobId = state.jobId;
    doneRef.current = false;

    const poll = async () => {
      // Skip if already done (prevents stale in-flight polls from overwriting)
      if (doneRef.current) return;

      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        setState((prev) => ({ ...prev, status: "failed", error: "Polling timeout" }));
        return;
      }

      try {
        const response = await syncService.getBatchJobStatus(currentJobId);
        const { data } = response;
        errorCountRef.current = 0;

        // Skip if a previous poll already marked as done
        if (doneRef.current) return;

        const isDone =
          data.state === "completed" ||
          data.state === "failed" ||
          (data.totalSeasons > 0 &&
            data.completedSeasons + data.failedSeasons >= data.totalSeasons &&
            data.seasons.every(
              (s: BatchSeedSeasonResult) =>
                s.status === "done" || s.status === "failed"
            ));

        if (isDone) {
          doneRef.current = true;
          stopPolling();
          const allFailed =
            data.failedSeasons > 0 && data.completedSeasons === 0;
          setState((prev) => ({
            ...prev,
            status: allFailed || data.state === "failed" ? "failed" : "completed",
            error: data.error ?? null,
            completedSeasons: data.completedSeasons,
            failedSeasons: data.failedSeasons,
            progress: data.progress,
            seasons: data.seasons,
          }));
        } else {
          setState((prev) => {
            // Guard: don't let a stale poll overwrite final state
            if (prev.status === "completed" || prev.status === "failed") {
              return prev;
            }
            return {
              ...prev,
              completedSeasons: data.completedSeasons,
              failedSeasons: data.failedSeasons,
              progress: data.progress,
              seasons: data.seasons,
            };
          });
        }
      } catch (err) {
        if (doneRef.current) return;
        errorCountRef.current += 1;
        console.error("[BulkSeed] Poll error:", err);
        if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          stopPolling();
          setState((prev) => ({
            ...prev,
            status: "failed",
            error: "Lost connection to server",
          }));
        }
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return stopPolling;
  }, [state.jobId, state.status, stopPolling]);

  const startBatch = useCallback(
    async (params: {
      seasonExternalIds: number[];
      futureOnly?: boolean;
    }) => {
      setState({
        status: "starting",
        jobId: null,
        totalSeasons: params.seasonExternalIds.length,
        completedSeasons: 0,
        failedSeasons: 0,
        progress: 0,
        seasons: params.seasonExternalIds.map((id) => ({
          seasonExternalId: id,
          status: "pending" as const,
        })),
        error: null,
      });
      attemptsRef.current = 0;
      errorCountRef.current = 0;
      doneRef.current = false;

      try {
        const response = await syncService.batchSeedSeasons({
          seasonExternalIds: params.seasonExternalIds,
          includeTeams: true,
          includeFixtures: true,
          futureOnly: params.futureOnly ?? true,
        });

        setState((prev) => ({
          ...prev,
          status: "processing",
          jobId: response.data.jobId,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: error instanceof Error ? error.message : "Failed to start batch",
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: "idle",
      jobId: null,
      totalSeasons: 0,
      completedSeasons: 0,
      failedSeasons: 0,
      progress: 0,
      seasons: [],
      error: null,
    });
  }, [stopPolling]);

  return {
    startBatch,
    reset,
    ...state,
    isLoading: state.status === "starting" || state.status === "processing",
  };
}
