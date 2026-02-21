import { describe, it, expect } from "vitest";

import { RECOVERY_OVERDUE_FIXTURES_JOB } from "../jobs.definitions";
import { getLockKeyForJob } from "../job-lock-keys";

describe("Fix 2: Recovery overdue fixtures — job definitions", () => {
  it("scheduleCron is every 10 minutes", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.scheduleCron).toBe("*/10 * * * *");
  });

  it("graceMinutes default is 10", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.meta.graceMinutes).toBe(10);
  });

  it("maxOverdueHours is 48", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.meta.maxOverdueHours).toBe(48);
  });

  it("is enabled by default", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.enabled).toBe(true);
  });
});

describe("Fix 2: Recovery overdue fixtures — lock keys", () => {
  it("has a dedicated lock key", () => {
    expect(getLockKeyForJob("recovery-overdue-fixtures")).toBe("sync:recovery-overdue");
  });

  it("does NOT share a lock key with live-fixtures", () => {
    const recoveryLock = getLockKeyForJob("recovery-overdue-fixtures");
    const liveLock = getLockKeyForJob("upsert-live-fixtures");
    expect(recoveryLock).not.toBe(liveLock);
  });
});
