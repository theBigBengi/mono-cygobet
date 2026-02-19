import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from "@/components/filters/multi-select-combobox";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AdminJobDetailResponse } from "@repo/types";
import type {
  FinishedFixturesJobMeta,
  PredictionRemindersJobMeta,
  RecoveryOverdueFixturesJobMeta,
  UpdatePrematchOddsJobMeta,
  UpcomingFixturesJobMeta,
} from "@repo/types";
import { Settings } from "lucide-react";
import {
  type ScheduleState,
  parseScheduleCron,
  buildCronFromSchedule,
  formatScheduleHuman,
  clampInt,
  asStringArray,
  UPDATE_PREMATCH_ODDS_JOB_KEY,
  UPCOMING_FIXTURES_JOB_KEY,
  FINISHED_FIXTURES_JOB_KEY,
  PREDICTION_REMINDERS_JOB_KEY,
  RECOVERY_OVERDUE_FIXTURES_JOB_KEY,
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
  reminderWindowHours: number;
  recoveryGraceMinutes: number;
  recoveryMaxOverdueHours: number;
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
    ...(job.key === PREDICTION_REMINDERS_JOB_KEY
      ? ({
          meta: {
            reminderWindowHours: jobForm.reminderWindowHours,
          } satisfies PredictionRemindersJobMeta,
        } as const)
      : {}),
    ...(job.key === RECOVERY_OVERDUE_FIXTURES_JOB_KEY
      ? ({
          meta: {
            graceMinutes: jobForm.recoveryGraceMinutes,
            maxOverdueHours: jobForm.recoveryMaxOverdueHours,
          } satisfies RecoveryOverdueFixturesJobMeta,
        } as const)
      : {}),
  };
}

function buildFormState(job: JobForForm): JobFormState {
  const oddsMeta = (job.meta ?? {}) as Record<string, unknown>;
  const odds = (oddsMeta["odds"] ?? {}) as Record<string, unknown>;
  return {
    description: job.description ?? "",
    enabled: !!job.enabled,
    schedule: parseScheduleCron(job.scheduleCron),
    oddsBookmakerExternalIds: asStringArray(odds["bookmakerExternalIds"]),
    oddsMarketExternalIds: asStringArray(odds["marketExternalIds"]),
    upcomingDaysAhead:
      job.key === UPCOMING_FIXTURES_JOB_KEY &&
      typeof oddsMeta["daysAhead"] === "number" &&
      Number.isFinite(oddsMeta["daysAhead"])
        ? Math.max(1, Math.trunc(oddsMeta["daysAhead"] as number))
        : 3,
    prematchDaysAhead:
      job.key === UPDATE_PREMATCH_ODDS_JOB_KEY &&
      typeof oddsMeta["daysAhead"] === "number" &&
      Number.isFinite(oddsMeta["daysAhead"])
        ? Math.max(1, Math.trunc(oddsMeta["daysAhead"] as number))
        : 7,
    finishedMaxLiveAgeHours:
      job.key === FINISHED_FIXTURES_JOB_KEY &&
      typeof oddsMeta["maxLiveAgeHours"] === "number" &&
      Number.isFinite(oddsMeta["maxLiveAgeHours"])
        ? Math.max(1, Math.trunc(oddsMeta["maxLiveAgeHours"] as number))
        : 2,
    reminderWindowHours:
      job.key === PREDICTION_REMINDERS_JOB_KEY &&
      typeof oddsMeta["reminderWindowHours"] === "number" &&
      Number.isFinite(oddsMeta["reminderWindowHours"])
        ? clampInt(oddsMeta["reminderWindowHours"] as number, 1, 24)
        : 2,
    recoveryGraceMinutes:
      job.key === RECOVERY_OVERDUE_FIXTURES_JOB_KEY &&
      typeof oddsMeta["graceMinutes"] === "number" &&
      Number.isFinite(oddsMeta["graceMinutes"])
        ? clampInt(oddsMeta["graceMinutes"] as number, 1, 120)
        : 30,
    recoveryMaxOverdueHours:
      job.key === RECOVERY_OVERDUE_FIXTURES_JOB_KEY &&
      typeof oddsMeta["maxOverdueHours"] === "number" &&
      Number.isFinite(oddsMeta["maxOverdueHours"])
        ? clampInt(oddsMeta["maxOverdueHours"] as number, 1, 168)
        : 48,
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
  const [jobForm, setJobForm] = useState<JobFormState>(() => buildFormState(job));
  const [prevJobKey, setPrevJobKey] = useState(job.key);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (job.key !== prevJobKey) {
    setPrevJobKey(job.key);
    setJobForm(buildFormState(job));
  }

  const initialState = buildFormState(job);
  const isDirty = JSON.stringify(jobForm) !== JSON.stringify(initialState);

  const handleSave = async () => {
    const patch = buildPatch(job, jobForm);
    await onSave(patch);
    setSettingsOpen(false);
  };

  return (
    <>
      {/* Quick actions bar — always visible */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Switch
            id="job-enabled"
            checked={jobForm.enabled}
            onCheckedChange={(v) =>
              setJobForm((prev) =>
                prev ? { ...prev, enabled: v } : prev
              )
            }
          />
          <Label htmlFor="job-enabled" className="text-sm cursor-pointer">
            {jobForm.enabled ? "Enabled" : "Disabled"}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onRunNow}
            disabled={!job.runnable || isRunPending}
          >
            {isRunPending ? "Running…" : "Run Now"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dirty indicator — show save outside dialog when toggle changed */}
      {isDirty && !settingsOpen && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSavePending}
          className="w-full mt-2"
        >
          {isSavePending ? "Saving…" : "Save Changes"}
        </Button>
      )}

      {/* Settings — Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-base">Settings</DrawerTitle>
              <DrawerDescription className="sr-only">Job configuration</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <SettingsFormBody
                job={job}
                jobForm={jobForm}
                setJobForm={setJobForm}
                bookmakerOptions={bookmakerOptions}
                marketOptions={marketOptions}
                isDirty={isDirty}
                isSavePending={isSavePending}
                onSave={handleSave}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">Settings</DialogTitle>
              <DialogDescription className="sr-only">Job configuration</DialogDescription>
            </DialogHeader>
            <SettingsFormBody
              job={job}
              jobForm={jobForm}
              setJobForm={setJobForm}
              bookmakerOptions={bookmakerOptions}
              marketOptions={marketOptions}
              isDirty={isDirty}
              isSavePending={isSavePending}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ---------- Shared form body ---------- */

function SettingsFormBody({
  job,
  jobForm,
  setJobForm,
  bookmakerOptions,
  marketOptions,
  isDirty,
  isSavePending,
  onSave,
}: {
  job: JobForForm;
  jobForm: JobFormState;
  setJobForm: React.Dispatch<React.SetStateAction<JobFormState>>;
  bookmakerOptions: MultiSelectOption[];
  marketOptions: MultiSelectOption[];
  isDirty: boolean;
  isSavePending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="job-description" className="text-xs text-muted-foreground">Description</Label>
        <Textarea
          id="job-description"
          value={jobForm.description}
          onChange={(e) =>
            setJobForm((prev) =>
              prev ? { ...prev, description: e.target.value } : prev
            )
          }
          placeholder="What does this job do?"
          className="min-h-[56px] sm:min-h-[80px] text-sm"
        />
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Schedule</Label>
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
                            ? { mode: "every_hours", intervalHours: 6, minute: 0 }
                            : v === "hourly"
                              ? { mode: "hourly", minute: 0 }
                              : v === "daily"
                                ? { mode: "daily", hour: 3, minute: 0 }
                                : v === "weekly"
                                  ? { mode: "weekly", dayOfWeek: 1, hour: 3, minute: 0 }
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
        <p className="text-[11px] text-muted-foreground">
          {formatScheduleHuman(buildCronFromSchedule(jobForm.schedule))}
          {jobForm.schedule.mode !== "disabled" && (
            <>
              {" — "}
              <span className="font-mono">
                {buildCronFromSchedule(jobForm.schedule) ?? "—"}
              </span>
            </>
          )}
        </p>
        {jobForm.schedule.mode === "every_minutes" && (
          <Select
            value={String(jobForm.schedule.intervalMinutes)}
            onValueChange={(v) =>
              setJobForm((prev) =>
                prev
                  ? { ...prev, schedule: { mode: "every_minutes", intervalMinutes: clampInt(Number(v), 1, 59) } }
                  : prev
              )
            }
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 10, 15, 20, 30, 45].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {jobForm.schedule.mode === "every_hours" && (
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(jobForm.schedule.intervalHours)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "every_hours"
                    ? { ...prev, schedule: { ...prev.schedule, intervalHours: clampInt(Number(v), 1, 23) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 6, 8, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>Every {n}h</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(jobForm.schedule.minute)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "every_hours"
                    ? { ...prev, schedule: { ...prev.schedule, minute: clampInt(Number(v), 0, 59) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 20, 30, 45].map((n) => (
                  <SelectItem key={n} value={String(n)}>at :{String(n).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {jobForm.schedule.mode === "hourly" && (
          <Select
            value={String(jobForm.schedule.minute)}
            onValueChange={(v) =>
              setJobForm((prev) =>
                prev && prev.schedule.mode === "hourly"
                  ? { ...prev, schedule: { ...prev.schedule, minute: clampInt(Number(v), 0, 59) } }
                  : prev
              )
            }
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 5, 10, 15, 20, 30, 45].map((n) => (
                <SelectItem key={n} value={String(n)}>at :{String(n).padStart(2, "0")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {jobForm.schedule.mode === "daily" && (
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(jobForm.schedule.hour)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "daily"
                    ? { ...prev, schedule: { ...prev.schedule, hour: clampInt(Number(v), 0, 23) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i).map((n) => (
                  <SelectItem key={n} value={String(n)}>{String(n).padStart(2, "0")}:00</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(jobForm.schedule.minute)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "daily"
                    ? { ...prev, schedule: { ...prev.schedule, minute: clampInt(Number(v), 0, 59) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 20, 30, 45].map((n) => (
                  <SelectItem key={n} value={String(n)}>:{String(n).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {jobForm.schedule.mode === "weekly" && (
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={String(jobForm.schedule.dayOfWeek)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "weekly"
                    ? { ...prev, schedule: { ...prev.schedule, dayOfWeek: clampInt(Number(v), 0, 6) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                  <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(jobForm.schedule.hour)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "weekly"
                    ? { ...prev, schedule: { ...prev.schedule, hour: clampInt(Number(v), 0, 23) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i).map((n) => (
                  <SelectItem key={n} value={String(n)}>{String(n).padStart(2, "0")}:00</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(jobForm.schedule.minute)}
              onValueChange={(v) =>
                setJobForm((prev) =>
                  prev && prev.schedule.mode === "weekly"
                    ? { ...prev, schedule: { ...prev.schedule, minute: clampInt(Number(v), 0, 59) } }
                    : prev
                )
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 20, 30, 45].map((n) => (
                  <SelectItem key={n} value={String(n)}>:{String(n).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {jobForm.schedule.mode === "custom" && (
          <Input
            value={jobForm.schedule.raw}
            onChange={(e) =>
              setJobForm((prev) =>
                prev ? { ...prev, schedule: { mode: "custom", raw: e.target.value } } : prev
              )
            }
            placeholder="*/5 * * * *"
            className="font-mono"
          />
        )}
      </div>

      {/* Job-specific settings */}
      {job.key === UPDATE_PREMATCH_ODDS_JOB_KEY && (
        <div className="space-y-3 border-t pt-3 min-w-0 overflow-hidden">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Odds settings</div>
          <div className="grid gap-1.5">
            <Label className="text-sm">Days ahead</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={jobForm.prematchDaysAhead}
              onChange={(e) => {
                const n = Math.trunc(Number(e.target.value));
                setJobForm((prev) =>
                  prev ? { ...prev, prematchDaysAhead: Number.isFinite(n) ? Math.max(1, Math.min(30, n)) : 1 } : prev
                );
              }}
            />
            <p className="text-[11px] text-muted-foreground">How far ahead to fetch odds (1-30)</p>
          </div>
          <div className="grid gap-1.5 min-w-0">
            <Label className="text-sm">Bookmakers</Label>
            <MultiSelectCombobox
              options={bookmakerOptions}
              selectedValues={jobForm.oddsBookmakerExternalIds}
              onSelectionChange={(values) =>
                setJobForm((prev) =>
                  prev ? { ...prev, oddsBookmakerExternalIds: values.map((v) => String(v)) } : prev
                )
              }
              placeholder="Select bookmakers..."
              searchPlaceholder="Search bookmakers..."
              emptyMessage="No bookmakers found."
            />
          </div>
          <div className="grid gap-1.5 min-w-0">
            <Label className="text-sm">Markets</Label>
            <MultiSelectCombobox
              options={marketOptions}
              selectedValues={jobForm.oddsMarketExternalIds}
              onSelectionChange={(values) =>
                setJobForm((prev) =>
                  prev ? { ...prev, oddsMarketExternalIds: values.map((v) => String(v)) } : prev
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
        <div className="space-y-3 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Settings</div>
          <div className="grid gap-1.5">
            <Label className="text-sm">Days ahead</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={jobForm.upcomingDaysAhead}
              onChange={(e) => {
                const n = Math.trunc(Number(e.target.value));
                setJobForm((prev) =>
                  prev ? { ...prev, upcomingDaysAhead: Number.isFinite(n) ? Math.max(1, Math.min(30, n)) : 1 } : prev
                );
              }}
            />
            <p className="text-[11px] text-muted-foreground">How many days ahead to fetch (1-30)</p>
          </div>
        </div>
      )}

      {job.key === FINISHED_FIXTURES_JOB_KEY && (
        <div className="space-y-3 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Settings</div>
          <div className="grid gap-1.5">
            <Label className="text-sm">Max live age (hours)</Label>
            <Input
              type="number"
              min={1}
              max={168}
              value={jobForm.finishedMaxLiveAgeHours}
              onChange={(e) => {
                const n = Math.trunc(Number(e.target.value));
                setJobForm((prev) =>
                  prev ? { ...prev, finishedMaxLiveAgeHours: Number.isFinite(n) ? Math.max(1, Math.min(168, n)) : 1 } : prev
                );
              }}
            />
            <p className="text-[11px] text-muted-foreground">Consider live after this many hours as finished (1-168)</p>
          </div>
        </div>
      )}

      {job.key === PREDICTION_REMINDERS_JOB_KEY && (
        <div className="space-y-3 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reminder settings</div>
          <div className="grid gap-1.5">
            <Label className="text-sm">Reminder window (hours)</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={jobForm.reminderWindowHours}
              onChange={(e) => {
                const n = Math.trunc(Number(e.target.value));
                setJobForm((prev) =>
                  prev ? { ...prev, reminderWindowHours: Number.isFinite(n) ? Math.max(1, Math.min(24, n)) : 2 } : prev
                );
              }}
            />
            <p className="text-[11px] text-muted-foreground">Hours before kickoff to send reminders (1-24)</p>
          </div>
        </div>
      )}

      {job.key === RECOVERY_OVERDUE_FIXTURES_JOB_KEY && (
        <div className="space-y-3 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recovery settings</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-sm">Grace period (min)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={jobForm.recoveryGraceMinutes}
                onChange={(e) => {
                  const n = Math.trunc(Number(e.target.value));
                  setJobForm((prev) =>
                    prev ? { ...prev, recoveryGraceMinutes: Number.isFinite(n) ? Math.max(1, Math.min(120, n)) : 30 } : prev
                  );
                }}
              />
              <p className="text-[11px] text-muted-foreground">Wait before considering stuck (1-120)</p>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-sm">Max overdue (hours)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={jobForm.recoveryMaxOverdueHours}
                onChange={(e) => {
                  const n = Math.trunc(Number(e.target.value));
                  setJobForm((prev) =>
                    prev ? { ...prev, recoveryMaxOverdueHours: Number.isFinite(n) ? Math.max(1, Math.min(168, n)) : 48 } : prev
                  );
                }}
              />
              <p className="text-[11px] text-muted-foreground">Ignore if overdue longer than this (1-168)</p>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <Button
        onClick={onSave}
        disabled={!isDirty || isSavePending}
        className="w-full"
      >
        {isSavePending ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
