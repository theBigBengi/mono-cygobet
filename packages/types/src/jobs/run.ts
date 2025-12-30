export const RunStatus = {
  success: "success",
  failed: "failed",
  skipped: "skipped",
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const RunTrigger = {
  manual: "manual",
  scheduled: "scheduled",
  api: "api",
} as const;

export type RunTrigger = (typeof RunTrigger)[keyof typeof RunTrigger];
