import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/table/status-badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { AdminJobsListResponse } from "@repo/types";
import {
  formatDateTime,
  formatScheduleHuman,
  titleCaseWords,
  jobNameFromKey,
} from "./jobs.utils";

type JobRow = AdminJobsListResponse["data"][0];

interface JobsCatalogTabProps {
  jobs: JobRow[];
  isLoading?: boolean;
  isError?: boolean;
  onOpenJob: (job: JobRow) => void;
  onRunJob: (jobKey: string) => void;
  isRunPending: (jobKey: string) => boolean;
  isRunPendingAny: boolean;
}

export function JobsCatalogTab({
  jobs,
  isLoading,
  isError,
  onOpenJob,
  onRunJob,
  isRunPending,
  isRunPendingAny,
}: JobsCatalogTabProps) {
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        (a.description ?? a.key).localeCompare(b.description ?? b.key)
      ),
    [jobs]
  );

  return (
    <TabsContent
      value="jobs"
      className="flex-1 min-h-0 overflow-hidden mt-4"
    >
      <Card className="flex flex-col h-full min-h-0 overflow-hidden border-0 shadow-none">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-auto">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading jobs…
              </div>
            ) : isError ? (
              <div className="py-10 text-center text-sm text-destructive">
                Failed to load jobs.
              </div>
            ) : !sortedJobs.length ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No jobs found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {sortedJobs.map((j) => {
                  const isRowPending = isRunPending(j.key);

                  return (
                    <Card
                      key={j.key}
                      className="cursor-default hover:bg-muted/50 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-sm truncate">
                              {titleCaseWords(jobNameFromKey(j.key))}
                            </CardTitle>
                            <CardDescription className="mt-1 font-mono text-[11px] truncate">
                              {j.key}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0 pt-0.5">
                            {j.enabled ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              Schedule
                            </div>
                            <div className="mt-1 text-xs">
                              {formatScheduleHuman(j.scheduleCron ?? null)}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">
                              {j.scheduleCron ?? "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] text-muted-foreground">
                              Last run
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <div className="whitespace-nowrap">
                                {j.lastRun ? (
                                  <StatusBadge status={j.lastRun.status} />
                                ) : (
                                  "—"
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatDateTime(
                                  j.lastRun?.startedAt ?? null
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="justify-end">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenJob(j);
                            }}
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRunJob(j.key);
                            }}
                            disabled={
                              !j.runnable ||
                              isRowPending ||
                              isRunPendingAny
                            }
                          >
                            {isRowPending ? "Running…" : "Run"}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
