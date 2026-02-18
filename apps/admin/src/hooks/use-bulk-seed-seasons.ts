import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";
import type { BatchSeedSeasonResult } from "@repo/types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // ~10 minutes

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
  const queryClient = useQueryClient();
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

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!state.jobId || state.status !== "processing") return;

    const poll = async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        setState((prev) => ({ ...prev, status: "failed", error: "Polling timeout" }));
        return;
      }

      try {
        const response = await syncService.getBatchJobStatus(state.jobId!);
        const { data } = response;

        setState((prev) => ({
          ...prev,
          completedSeasons: data.completedSeasons,
          failedSeasons: data.failedSeasons,
          progress: data.progress,
          seasons: data.seasons,
        }));

        if (data.state === "completed" || data.state === "failed") {
          stopPolling();
          setState((prev) => ({
            ...prev,
            status: data.state === "completed" ? "completed" : "failed",
            error: data.error ?? null,
            completedSeasons: data.completedSeasons,
            failedSeasons: data.failedSeasons,
            progress: data.progress,
            seasons: data.seasons,
          }));
          queryClient.invalidateQueries({ queryKey: ["sync-center"] });
          queryClient.invalidateQueries({ queryKey: ["batches"] });
        }
      } catch {
        // Silently retry on poll errors
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    // Also poll immediately
    poll();

    return stopPolling;
  }, [state.jobId, state.status, queryClient, stopPolling]);

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
