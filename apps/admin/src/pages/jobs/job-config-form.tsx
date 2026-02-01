import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AdminJobDetailResponse } from "@repo/types";
import type {
  FinishedFixturesJobMeta,
  UpdatePrematchOddsJobMeta,
  UpcomingFixturesJobMeta,
} from "@repo/types";
import {
  type ScheduleState,
  parseScheduleCron,
  buildCronFromSchedule,
  clampInt,
  asStringArray,
  UPDATE_PREMATCH_ODDS_JOB_KEY,
  UPCOMING_FIXTURES_JOB_KEY,
  FINISHED_FIXTURES_JOB_KEY,
} from "./jobs.utils";

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

type JobForForm = NonNullable<AdminJobDetailResponse["data"]>;

export interface JobConfigFormProps {
  job: JobForForm;
  bookmakerOptions: MultiSelectOption[];
  marketOptions: MultiSelectOption[];
  onSave: (patch: {
    description?: string | null;
    enabled?: boolean;
    scheduleCron?: string | null;
    meta?: Record<string, unknown> | null;
  }) => Promise<void>;
  onRunNow: () => void;
  isSavePending: boolean;
  isRunPending: boolean;
}

function buildPatch(
  job: JobForForm,
  jobForm: JobFormState
): {
  description: string | null;
  enabled: boolean;
  scheduleCron: string | null;
  meta?: Record<string, unknown>;
} {
  return {
    description: jobForm.description.trim() || null,
    enabled: jobForm.enabled,
    scheduleCron: buildCronFromSchedule(jobForm.schedule),
    ...(job.key === UPDATE_PREMATCH_ODDS_JOB_KEY
      ? {
          meta: {
            daysAhead: jobForm.prematchDaysAhead,
            odds: {
              bookmakerExternalIds: jobForm.oddsBookmakerExternalIds
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
}

export function JobConfigForm({
  job,
  bookmakerOptions,
  marketOptions,
  onSave,
  onRunNow,
  isSavePending,
  isRunPending,
}: JobConfigFormProps) {
  const [jobForm, setJobForm] = useState<JobFormState | null>(null);

  useEffect(() => {
    const oddsMeta = (job.meta ?? {}) as Record<string, unknown>;
    const odds = (oddsMeta["odds"] ?? {}) as Record<string, unknown>;
    const upcomingDaysAhead =
      job.key === UPCOMING_FIXTURES_JOB_KEY &&
      typeof (job.meta as Record<string, unknown>)["daysAhead"] === "number" &&
      Number.isFinite((job.meta as Record<string, unknown>)["daysAhead"])
        ? Math.max(
            1,
            Math.trunc((job.meta as Record<string, unknown>)["daysAhead"] as number)
          )
        : 3;
    const prematchDaysAhead =
      job.key === UPDATE_PREMATCH_ODDS_JOB_KEY &&
      typeof oddsMeta["daysAhead"] === "number" &&
      Number.isFinite(oddsMeta["daysAhead"])
        ? Math.max(1, Math.trunc(oddsMeta["daysAhead"] as number))
        : 7;
    const finishedMaxLiveAgeHours =
      job.key === FINISHED_FIXTURES_JOB_KEY &&
      typeof (job.meta as Record<string, unknown>)["maxLiveAgeHours"] ===
        "number" &&
      Number.isFinite(
        (job.meta as Record<string, unknown>)["maxLiveAgeHours"]
      )
        ? Math.max(
            1,
            Math.trunc(
              (job.meta as Record<string, unknown>)["maxLiveAgeHours"] as number
            )
          )
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

  if (!jobForm) return null;

  const handleSave = () => {
    const patch = buildPatch(job, jobForm);
    onSave(patch);
  };

  return (
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
        <div className="space-y-3 rounded-lg border p-4">
          <div className="text-sm font-medium">Job metadata</div>
          <div className="text-xs text-muted-foreground mb-3">
            Days ahead, bookmakers, markets.
          </div>
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
              Bookmakers
            </Label>
            <MultiSelectCombobox
              options={bookmakerOptions}
              selectedValues={jobForm.oddsBookmakerExternalIds}
              onSelectionChange={(values) =>
                setJobForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        oddsBookmakerExternalIds: values.map((v) => String(v)),
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
            <Label className="text-xs text-muted-foreground">Markets</Label>
            <MultiSelectCombobox
              options={marketOptions}
              selectedValues={jobForm.oddsMarketExternalIds}
              onSelectionChange={(values) =>
                setJobForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        oddsMarketExternalIds: values.map((v) => String(v)),
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
      )}

      {job.key === UPCOMING_FIXTURES_JOB_KEY && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="text-sm font-medium">Upcoming fixtures</div>
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
          <div className="text-sm font-medium">Finished fixtures</div>
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
                          ? { mode: "every_minutes", intervalMinutes: 5 }
                          : v === "every_hours"
                            ? {
                                mode: "every_hours",
                                intervalHours: 6,
                                minute: 0,
                              }
                            : v === "hourly"
                              ? { mode: "hourly", minute: 0 }
                              : v === "daily"
                                ? { mode: "daily", hour: 3, minute: 0 }
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
            <SelectItem value="disabled">Disabled (manual only)</SelectItem>
            <SelectItem value="every_minutes">Every N minutes</SelectItem>
            <SelectItem value="every_hours">Every N hours</SelectItem>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="custom">Custom cron</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Cron:{" "}
          <span className="font-mono">
            {buildCronFromSchedule(jobForm.schedule) ?? "—"}
          </span>
        </p>
        {jobForm.schedule.mode === "every_minutes" && (
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
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
                          intervalMinutes: clampInt(Number(v), 1, 59),
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
                {[1, 2, 3, 5, 10, 15, 20, 30, 45].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {jobForm.schedule.mode === "custom" && (
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              Cron (5 fields)
            </Label>
            <Input
              value={jobForm.schedule.raw}
              onChange={(e) =>
                setJobForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        schedule: { mode: "custom", raw: e.target.value },
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
            When disabled, it won&apos;t run on schedule.
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

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="secondary"
          onClick={onRunNow}
          disabled={!job.runnable || isRunPending}
        >
          {isRunPending ? "Running…" : "Run Now"}
        </Button>
        <Button onClick={handleSave} disabled={isSavePending}>
          {isSavePending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
