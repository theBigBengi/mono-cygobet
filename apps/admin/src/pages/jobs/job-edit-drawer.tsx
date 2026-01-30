import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from "@/components/filters/multi-select-combobox";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CheckCircle2, XCircle } from "lucide-react";
import type { AdminJobsListResponse } from "@repo/types";
import type {
  FinishedFixturesJobMeta,
  UpdatePrematchOddsJobMeta,
  UpcomingFixturesJobMeta,
} from "@repo/types";
import { jobsService } from "@/services/jobs.service";
import {
  type ScheduleState,
  parseScheduleCron,
  buildCronFromSchedule,
  clampInt,
  asStringArray,
  titleCaseWords,
  jobNameFromKey,
  UPDATE_PREMATCH_ODDS_JOB_KEY,
  UPCOMING_FIXTURES_JOB_KEY,
  FINISHED_FIXTURES_JOB_KEY,
} from "./jobs.utils";

type JobRow = AdminJobsListResponse["data"][0];

export type JobFormState = {
  description: string;
  enabled: boolean;
  schedule: ScheduleState;
  oddsBookmakerExternalIds: string[];
  oddsMarketExternalIds: string[];
  upcomingDaysAhead: number;
  prematchDaysAhead: number;
  finishedMaxLiveAgeHours: number;
};

interface JobEditDrawerProps {
  job: JobRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmakerOptions: MultiSelectOption[];
  marketOptions: MultiSelectOption[];
}

export function JobEditDrawer({
  job,
  open,
  onOpenChange,
  bookmakerOptions,
  marketOptions,
}: JobEditDrawerProps) {
  const queryClient = useQueryClient();
  const [jobForm, setJobForm] = useState<JobFormState | null>(null);

  useEffect(() => {
    if (!job) {
      setJobForm(null);
      return;
    }
    const oddsMeta = (job.meta ?? {}) as Record<string, unknown>;
    const odds = (oddsMeta["odds"] ?? {}) as Record<string, unknown>;
    const upcomingMeta = (job.meta ?? {}) as Record<string, unknown>;
    const upcomingDaysAhead =
      job.key === UPCOMING_FIXTURES_JOB_KEY &&
      typeof upcomingMeta["daysAhead"] === "number" &&
      Number.isFinite(upcomingMeta["daysAhead"])
        ? Math.max(1, Math.trunc(upcomingMeta["daysAhead"] as number))
        : 3;
    const prematchDaysAhead =
      job.key === UPDATE_PREMATCH_ODDS_JOB_KEY &&
      typeof oddsMeta["daysAhead"] === "number" &&
      Number.isFinite(oddsMeta["daysAhead"])
        ? Math.max(1, Math.trunc(oddsMeta["daysAhead"] as number))
        : 7;
    const finishedMaxLiveAgeHours =
      job.key === FINISHED_FIXTURES_JOB_KEY &&
      typeof oddsMeta["maxLiveAgeHours"] === "number" &&
      Number.isFinite(oddsMeta["maxLiveAgeHours"])
        ? Math.max(1, Math.trunc(oddsMeta["maxLiveAgeHours"] as number))
        : 2;
    setJobForm({
      description: job.description ?? "",
      enabled: !!job.enabled,
      schedule: parseScheduleCron(job.scheduleCron),
      oddsBookmakerExternalIds: asStringArray(odds["bookmakerExternalIds"]),
      oddsMarketExternalIds: asStringArray(odds["marketExternalIds"]),
      upcomingDaysAhead,
      prematchDaysAhead,
      finishedMaxLiveAgeHours,
    });
  }, [job]);

  const updateJobMutation = useMutation({
    mutationFn: async (vars: {
      jobKey: string;
      patch: {
        description?: string | null;
        enabled?: boolean;
        scheduleCron?: string | null;
        meta?: Record<string, unknown> | null;
      };
    }) => jobsService.updateJob(vars.jobKey, vars.patch),
    onSuccess: () => {
      toast.success("Job updated");
      queryClient.invalidateQueries({ queryKey: ["jobs", "db"] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error("Update failed", { description: e.message });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        hideClose
        side="right"
        className="sm:max-w-xl p-0 flex flex-col h-full min-h-0"
      >
        {job && jobForm ? (
          <>
            <div className="p-6 pb-4">
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="truncate">
                      {titleCaseWords(jobNameFromKey(job.key))}
                    </SheetTitle>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Key{" "}
                      <span className="font-mono text-foreground">
                        {job.key}
                      </span>
                    </div>
                  </div>
                  <div className="mt-0.5 flex-shrink-0">
                    {jobForm.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <VisuallyHidden>
                  <SheetDescription className="mt-2">
                    Configure job settings.
                  </SheetDescription>
                </VisuallyHidden>
              </SheetHeader>

              <div className="mt-2 text-xs text-muted-foreground">
                Cron preview:{" "}
                <span className="font-mono text-foreground">
                  {buildCronFromSchedule(jobForm.schedule) ?? "—"}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="job-description">Description</Label>
                  <Textarea
                    id="job-description"
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
                    placeholder="What does this job do?"
                    className="min-h-[96px]"
                  />
                </div>

                {job.key === "update-prematch-odds" && (
                  <>
                    <div>
                      <div className="text-sm font-medium">Job metadata</div>
                      <div className="text-xs text-muted-foreground">
                        Controls job-specific parameters. Bookmakers, markets
                        and days ahead.
                      </div>

                      <div className="mt-3 space-y-3 rounded-lg border p-4">
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Days ahead
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={jobForm.prematchDaysAhead}
                            onChange={(e) => {
                              const n = Math.trunc(Number(e.target.value));
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      prematchDaysAhead: Number.isFinite(n)
                                        ? Math.max(1, Math.min(30, n))
                                        : 1,
                                    }
                                  : prev
                              );
                            }}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Bookmakers (external IDs)
                          </Label>
                          <MultiSelectCombobox
                            options={bookmakerOptions}
                            selectedValues={jobForm.oddsBookmakerExternalIds}
                            onSelectionChange={(values) =>
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      oddsBookmakerExternalIds: values.map(
                                        (v) => String(v)
                                      ),
                                    }
                                  : prev
                              )
                            }
                            placeholder="Select bookmakers..."
                            searchPlaceholder="Search bookmakers..."
                            emptyMessage="No bookmakers found."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Markets (external IDs)
                          </Label>
                          <MultiSelectCombobox
                            options={marketOptions}
                            selectedValues={jobForm.oddsMarketExternalIds}
                            onSelectionChange={(values) =>
                              setJobForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      oddsMarketExternalIds: values.map((v) =>
                                        String(v)
                                      ),
                                    }
                                  : prev
                              )
                            }
                            placeholder="Select markets..."
                            searchPlaceholder="Search markets..."
                            emptyMessage="No markets found."
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {job.key === UPCOMING_FIXTURES_JOB_KEY && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-medium">
                        Upcoming fixtures parameters
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Controls how many days ahead we fetch NS fixtures.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Days ahead
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={jobForm.upcomingDaysAhead}
                        onChange={(e) => {
                          const n = Math.trunc(Number(e.target.value));
                          setJobForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  upcomingDaysAhead: Number.isFinite(n)
                                    ? Math.max(1, Math.min(30, n))
                                    : 1,
                                }
                              : prev
                          );
                        }}
                      />
                    </div>
                  </div>
                )}

                {job.key === FINISHED_FIXTURES_JOB_KEY && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-medium">
                        Finished fixtures parameters
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Re-check LIVE fixtures older than this threshold.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Max live age (hours)
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={jobForm.finishedMaxLiveAgeHours}
                        onChange={(e) => {
                          const n = Math.trunc(Number(e.target.value));
                          setJobForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  finishedMaxLiveAgeHours: Number.isFinite(n)
                                    ? Math.max(1, Math.min(168, n))
                                    : 1,
                                }
                              : prev
                          );
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Schedule</Label>

                  <Select
                    value={jobForm.schedule.mode}
                    onValueChange={(v) =>
                      setJobForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              schedule:
                                v === "disabled"
                                  ? { mode: "disabled" }
                                  : v === "every_minutes"
                                    ? {
                                        mode: "every_minutes",
                                        intervalMinutes: 5,
                                      }
                                    : v === "every_hours"
                                      ? {
                                          mode: "every_hours",
                                          intervalHours: 6,
                                          minute: 0,
                                        }
                                      : v === "hourly"
                                        ? { mode: "hourly", minute: 0 }
                                        : v === "daily"
                                          ? {
                                              mode: "daily",
                                              hour: 3,
                                              minute: 0,
                                            }
                                          : v === "weekly"
                                            ? {
                                                mode: "weekly",
                                                dayOfWeek: 1,
                                                hour: 3,
                                                minute: 0,
                                              }
                                            : { mode: "custom", raw: "" },
                            }
                          : prev
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">
                        Disabled (manual only)
                      </SelectItem>
                      <SelectItem value="every_minutes">
                        Every N minutes
                      </SelectItem>
                      <SelectItem value="every_hours">
                        Every N hours
                      </SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom cron</SelectItem>
                    </SelectContent>
                  </Select>

                  {jobForm.schedule.mode === "every_minutes" && (
                    <div className="grid gap-2">
                      <Label
                        htmlFor="every-minutes"
                        className="text-xs text-muted-foreground"
                      >
                        Interval (minutes)
                      </Label>
                      <Select
                        value={String(jobForm.schedule.intervalMinutes)}
                        onValueChange={(v) =>
                          setJobForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  schedule: {
                                    mode: "every_minutes",
                                    intervalMinutes: clampInt(
                                      Number(v),
                                      1,
                                      59
                                    ),
                                  },
                                }
                              : prev
                          )
                        }
                      >
                        <SelectTrigger id="every-minutes" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 10, 15, 20, 30, 45].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}

                  {jobForm.schedule.mode === "every_hours" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label
                          htmlFor="every-hours"
                          className="text-xs text-muted-foreground"
                        >
                          Interval (hours)
                        </Label>
                        <Select
                          value={String(jobForm.schedule.intervalHours)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "every_hours",
                                      intervalHours: clampInt(
                                        Number(v),
                                        1,
                                        23
                                      ),
                                      minute:
                                        prev.schedule.mode === "every_hours"
                                          ? prev.schedule.minute
                                          : 0,
                                    },
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger id="every-hours" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 6, 8, 12].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n} hours
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label
                          htmlFor="every-hours-minute"
                          className="text-xs text-muted-foreground"
                        >
                          Minute within hour
                        </Label>
                        <Select
                          value={String(jobForm.schedule.minute)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "every_hours",
                                      intervalHours:
                                        prev.schedule.mode === "every_hours"
                                          ? prev.schedule.intervalHours
                                          : 6,
                                      minute: clampInt(Number(v), 0, 59),
                                    },
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger
                            id="every-hours-minute"
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                minute {m.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {jobForm.schedule.mode === "hourly" && (
                    <div className="grid gap-2">
                      <Label
                        htmlFor="hourly-minute"
                        className="text-xs text-muted-foreground"
                      >
                        Minute of hour
                      </Label>
                      <Select
                        value={String(jobForm.schedule.minute)}
                        onValueChange={(v) =>
                          setJobForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  schedule: {
                                    mode: "hourly",
                                    minute: clampInt(Number(v), 0, 59),
                                  },
                                }
                              : prev
                          )
                        }
                      >
                        <SelectTrigger id="hourly-minute" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              minute {m.toString().padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {jobForm.schedule.mode === "daily" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Hour
                        </Label>
                        <Select
                          value={String(jobForm.schedule.hour)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "daily",
                                      hour: clampInt(Number(v), 0, 23),
                                      minute:
                                        prev.schedule.mode === "daily"
                                          ? prev.schedule.minute
                                          : 0,
                                    },
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Minute
                        </Label>
                        <Select
                          value={String(jobForm.schedule.minute)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    schedule: {
                                      mode: "daily",
                                      hour:
                                        prev.schedule.mode === "daily"
                                          ? prev.schedule.hour
                                          : 0,
                                      minute: clampInt(Number(v), 0, 59),
                                    },
                                  }
                                : prev
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {m.toString().padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {jobForm.schedule.mode === "weekly" && (
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Day of week
                        </Label>
                        <Select
                          value={String(jobForm.schedule.dayOfWeek)}
                          onValueChange={(v) =>
                            setJobForm((prev) =>
                              prev
                                ? (() => {
                                    const base =
                                      prev.schedule.mode === "weekly"
                                        ? prev.schedule
                                        : {
                                            mode: "weekly" as const,
                                            dayOfWeek: 1,
                                            hour: 3,
                                            minute: 0,
                                          };
                                    return {
                                      ...prev,
                                      schedule: {
                                        ...base,
                                        dayOfWeek: clampInt(Number(v), 0, 6),
                                      },
                                    };
                                  })()
                                : prev
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { v: 0, label: "Sunday" },
                              { v: 1, label: "Monday" },
                              { v: 2, label: "Tuesday" },
                              { v: 3, label: "Wednesday" },
                              { v: 4, label: "Thursday" },
                              { v: 5, label: "Friday" },
                              { v: 6, label: "Saturday" },
                            ].map((d) => (
                              <SelectItem key={d.v} value={String(d.v)}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Hour
                          </Label>
                          <Select
                            value={String(jobForm.schedule.hour)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? (() => {
                                      const base =
                                        prev.schedule.mode === "weekly"
                                          ? prev.schedule
                                          : {
                                              mode: "weekly" as const,
                                              dayOfWeek: 1,
                                              hour: 3,
                                              minute: 0,
                                            };
                                      return {
                                        ...prev,
                                        schedule: {
                                          ...base,
                                          hour: clampInt(Number(v), 0, 23),
                                        },
                                      };
                                    })()
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {i.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Minute
                          </Label>
                          <Select
                            value={String(jobForm.schedule.minute)}
                            onValueChange={(v) =>
                              setJobForm((prev) =>
                                prev
                                  ? (() => {
                                      const base =
                                        prev.schedule.mode === "weekly"
                                          ? prev.schedule
                                          : {
                                              mode: "weekly" as const,
                                              dayOfWeek: 1,
                                              hour: 3,
                                              minute: 0,
                                            };
                                      return {
                                        ...prev,
                                        schedule: {
                                          ...base,
                                          minute: clampInt(Number(v), 0, 59),
                                        },
                                      };
                                    })()
                                  : prev
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 5, 10, 15, 20, 30, 45].map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                  {m.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {jobForm.schedule.mode === "custom" && (
                    <div className="grid gap-2">
                      <Label
                        htmlFor="cron-custom"
                        className="text-xs text-muted-foreground"
                      >
                        Cron expression (5 fields)
                      </Label>
                      <Input
                        id="cron-custom"
                        value={jobForm.schedule.raw}
                        onChange={(e) =>
                          setJobForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  schedule: {
                                    mode: "custom",
                                    raw: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="*/5 * * * *"
                        className="font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="text-sm font-medium">Enabled</div>
                    <div className="text-xs text-muted-foreground">
                      When disabled, it won't run on schedule.
                    </div>
                  </div>
                  <Checkbox
                    id="job-enabled"
                    checked={jobForm.enabled}
                    onCheckedChange={(v) =>
                      setJobForm((prev) =>
                        prev ? { ...prev, enabled: v === true } : prev
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-background flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={updateJobMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const patch = {
                    description: jobForm.description.trim() || null,
                    enabled: jobForm.enabled,
                    scheduleCron: buildCronFromSchedule(jobForm.schedule),
                    ...(job.key === UPDATE_PREMATCH_ODDS_JOB_KEY
                      ? {
                          meta: {
                            daysAhead: jobForm.prematchDaysAhead,
                            odds: {
                              bookmakerExternalIds:
                                jobForm.oddsBookmakerExternalIds
                                  .map((v) => Math.trunc(Number(v)))
                                  .filter((n) => Number.isFinite(n)),
                              marketExternalIds: jobForm.oddsMarketExternalIds
                                .map((v) => Math.trunc(Number(v)))
                                .filter((n) => Number.isFinite(n)),
                            },
                          } satisfies UpdatePrematchOddsJobMeta,
                        }
                      : {}),
                    ...(job.key === UPCOMING_FIXTURES_JOB_KEY
                      ? ({
                          meta: {
                            daysAhead: jobForm.upcomingDaysAhead,
                          } satisfies UpcomingFixturesJobMeta,
                        } as const)
                      : {}),
                    ...(job.key === FINISHED_FIXTURES_JOB_KEY
                      ? ({
                          meta: {
                            maxLiveAgeHours: jobForm.finishedMaxLiveAgeHours,
                          } satisfies FinishedFixturesJobMeta,
                        } as const)
                      : {}),
                  };
                  updateJobMutation.mutate({
                    jobKey: job.key,
                    patch,
                  });
                }}
                disabled={updateJobMutation.isPending}
              >
                Save
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Job</SheetTitle>
              <SheetDescription>
                Select a job to edit settings.
              </SheetDescription>
            </SheetHeader>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
