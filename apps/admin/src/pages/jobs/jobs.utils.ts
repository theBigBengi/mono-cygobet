export type JobsTab = "runs" | "jobs";

export type ScheduleState =
  | { mode: "disabled" }
  | { mode: "every_minutes"; intervalMinutes: number }
  | { mode: "every_hours"; intervalHours: number; minute: number }
  | { mode: "hourly"; minute: number }
  | { mode: "daily"; hour: number; minute: number }
  | { mode: "weekly"; dayOfWeek: number; hour: number; minute: number }
  | { mode: "custom"; raw: string };

export const UPDATE_PREMATCH_ODDS_JOB_KEY = "update-prematch-odds" as const;
export const UPCOMING_FIXTURES_JOB_KEY = "upsert-upcoming-fixtures" as const;
export const FINISHED_FIXTURES_JOB_KEY = "finished-fixtures" as const;

export function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

export function formatDurationMs(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export function truncate(s: string, max = 120) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function jobNameFromKey(key: string): string {
  return key.replace(/-/g, " ");
}

export function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      const v = w.trim();
      if (!v) return "";
      return v[0]!.toUpperCase() + v.slice(1);
    })
    .filter(Boolean)
    .join(" ");
}

export function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string" || typeof x === "number" ? String(x) : ""
    )
    .filter(Boolean);
}

export function parseScheduleCron(cronExpr: string | null): ScheduleState {
  const raw = (cronExpr ?? "").trim();
  if (!raw) return { mode: "disabled" };

  const parts = raw.split(/\s+/);
  if (parts.length !== 5) return { mode: "custom", raw };

  {
    const m = raw.match(/^(\d+)\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
    if (m) {
      const minute = clampInt(Number(m[1]), 0, 59);
      const intervalHours = clampInt(Number(m[2]), 1, 23);
      if (intervalHours === 1) {
        return { mode: "hourly", minute };
      }
      return { mode: "every_hours", minute, intervalHours };
    }
  }

  {
    const m = raw.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (m) {
      return {
        mode: "every_minutes",
        intervalMinutes: clampInt(Number(m[1]), 1, 59),
      };
    }
  }

  {
    const m = raw.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (m) {
      return { mode: "hourly", minute: clampInt(Number(m[1]), 0, 59) };
    }
  }

  {
    const m = raw.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
    if (m) {
      return {
        mode: "daily",
        minute: clampInt(Number(m[1]), 0, 59),
        hour: clampInt(Number(m[2]), 0, 23),
      };
    }
  }

  {
    const m = raw.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+(\d+)$/);
    if (m) {
      return {
        mode: "weekly",
        minute: clampInt(Number(m[1]), 0, 59),
        hour: clampInt(Number(m[2]), 0, 23),
        dayOfWeek: clampInt(Number(m[3]), 0, 6),
      };
    }
  }

  return { mode: "custom", raw };
}

export function buildCronFromSchedule(schedule: ScheduleState): string | null {
  switch (schedule.mode) {
    case "disabled":
      return null;
    case "every_minutes":
      return `*/${clampInt(schedule.intervalMinutes, 1, 59)} * * * *`;
    case "every_hours":
      return `${clampInt(schedule.minute, 0, 59)} */${clampInt(
        schedule.intervalHours,
        1,
        23
      )} * * *`;
    case "hourly":
      return `${clampInt(schedule.minute, 0, 59)} * * * *`;
    case "daily":
      return `${clampInt(schedule.minute, 0, 59)} ${clampInt(schedule.hour, 0, 23)} * * *`;
    case "weekly":
      return `${clampInt(schedule.minute, 0, 59)} ${clampInt(schedule.hour, 0, 23)} * * ${clampInt(schedule.dayOfWeek, 0, 6)}`;
    case "custom": {
      const raw = schedule.raw.trim();
      return raw ? raw : null;
    }
    default: {
      const _exhaustive: never = schedule;
      return _exhaustive;
    }
  }
}

export function formatScheduleHuman(scheduleCron: string | null): string {
  const s = parseScheduleCron(scheduleCron);
  switch (s.mode) {
    case "disabled":
      return "Disabled";
    case "every_minutes":
      return `Every ${s.intervalMinutes} minute${s.intervalMinutes === 1 ? "" : "s"}`;
    case "every_hours":
      return `Every ${s.intervalHours} hour${s.intervalHours === 1 ? "" : "s"} at :${String(
        clampInt(s.minute, 0, 59)
      ).padStart(2, "0")}`;
    case "hourly":
      return `Hourly at :${String(clampInt(s.minute, 0, 59)).padStart(2, "0")}`;
    case "daily":
      return `Daily ${String(clampInt(s.hour, 0, 23)).padStart(2, "0")}:${String(
        clampInt(s.minute, 0, 59)
      ).padStart(2, "0")}`;
    case "weekly": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
      const dow = clampInt(s.dayOfWeek, 0, 6);
      return `Weekly ${days[dow]} ${String(clampInt(s.hour, 0, 23)).padStart(
        2,
        "0"
      )}:${String(clampInt(s.minute, 0, 59)).padStart(2, "0")}`;
    }
    case "custom":
      return "Custom";
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

export function getEnvLabel(meta: Record<string, unknown>): string {
  const env = meta["environment"];
  return env === "PRODUCTION" || env === "DEVELOPMENT" ? String(env) : "—";
}

const REASON_LABELS: Record<string, string> = {
  disabled: "Disabled",
  "no-odds": "No odds",
  "no-candidates": "No candidates",
  "no-upcoming-ns": "No NS fixtures",
  "no-valid-external-ids": "No valid IDs",
  "no-finished-fixtures": "No finished",
};

export function getRunReason(meta: Record<string, unknown>): string | null {
  const reason = meta["reason"];
  if (typeof reason !== "string" || !reason) return null;
  return REASON_LABELS[reason] ?? reason;
}

export function isNoOp(
  meta: Record<string, unknown>,
  rowsAffected: number | null
): boolean {
  return !!meta["reason"] || rowsAffected === 0;
}
