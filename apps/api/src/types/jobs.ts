import { JobTriggerBy, RunTrigger } from "@repo/db";

export type JobRunOpts = {
  dryRun?: boolean;
  /**
   * Whether this run was triggered automatically (cron) or manually.
   * If omitted, jobs will infer it from `triggeredBy` when possible.
   */
  trigger?: RunTrigger;
  triggeredBy?: JobTriggerBy | null;
  triggeredById?: string | null;
  meta?: Record<string, any>;
  idempotencyKey?: string;
};

export type JobRunResult<T = any> = {
  jobRunId: number;
  meta: T;
};
