import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { syncService } from "@/services/sync.service";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // ~5 minutes at 2s

type JobStatus = "idle" | "pending" | "completed" | "failed" | "timeout";

export function useSeedSeason() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobResult, setJobResult] = useState<{
    season?: { id: number; name: string; league: string; created: boolean };
    teams?: { ok: number; fail: number; total: number };
    fixtures?: { ok: number; fail: number; total: number };
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const mutation = useMutation({
    mutationFn: syncService.seedSeason,
    onSuccess: (response) => {
      setJobId(response.data.jobId);
      setJobStatus("pending");
      attemptsRef.current = 0;
      toast.info("Seeding started...");
    },
    onError: (error: Error) => {
      toast.error("Failed to start seeding", { description: error.message });
      setJobStatus("failed");
    },
  });

  useEffect(() => {
    if (!jobId || jobStatus !== "pending") return;

    const poll = async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setJobStatus("timeout");
        toast.warning(
          "Job is taking longer than expected. Check Sync History for status."
        );
        queryClient.invalidateQueries({ queryKey: ["sync-center"] });
        return;
      }

      try {
        const status = await syncService.getJobStatus(jobId);

        if (status.data.state === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setJobStatus("completed");
          setJobResult(status.data.result ?? null);
          toast.success("Season seeded successfully!");
          queryClient.invalidateQueries({ queryKey: ["sync-center"] });
        } else if (status.data.state === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setJobStatus("failed");
          toast.error("Seeding failed", {
            description: status.data.error ?? "Unknown error",
          });
        }
      } catch (error) {
        console.error("Failed to poll job status", error);
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, jobStatus, queryClient]);

  const seedSeason = (
    seasonExternalId: number,
    options?: { dryRun?: boolean }
  ) => {
    setJobStatus("idle");
    setJobResult(null);
    mutation.mutate({
      seasonExternalId,
      includeTeams: true,
      includeFixtures: true,
      dryRun: options?.dryRun ?? false,
    });
  };

  const reset = () => {
    setJobId(null);
    setJobStatus("idle");
    setJobResult(null);
  };

  return {
    seedSeason,
    reset,
    isLoading: mutation.isPending || jobStatus === "pending",
    jobStatus,
    jobResult,
  };
}
