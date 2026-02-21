import { describe, it, expect } from "vitest";

import { RECOVERY_OVERDUE_FIXTURES_JOB, LIVE_FIXTURES_JOB, JOB_DEFINITIONS } from "../jobs.definitions";
import { getLockKeyForJob } from "../job-lock-keys";

describe("Fix 2: Recovery overdue fixtures — job definitions", () => {
  it("is registered in JOB_DEFINITIONS", () => {
    const keys = JOB_DEFINITIONS.map((j) => j.key);
    expect(keys).toContain("recovery-overdue-fixtures");
  });

  it("has a scheduleCron set (not null)", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.scheduleCron).not.toBeNull();
  });

  it("has graceMinutes defined in meta", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.meta.graceMinutes).toBeGreaterThan(0);
  });

  it("has maxOverdueHours defined in meta", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.meta.maxOverdueHours).toBeGreaterThan(0);
  });

  it("is enabled by default", () => {
    expect(RECOVERY_OVERDUE_FIXTURES_JOB.enabled).toBe(true);
  });
});

describe("Fix 2: Lock key isolation", () => {
  it("recovery-overdue-fixtures has an explicit lock key", () => {
    const lockKey = getLockKeyForJob("recovery-overdue-fixtures");
    // Should NOT fall back to the job key itself (i.e., an explicit entry exists)
    expect(lockKey).not.toBe("recovery-overdue-fixtures");
  });

  it("does NOT share a lock key with live-fixtures", () => {
    const recoveryLock = getLockKeyForJob("recovery-overdue-fixtures");
    const liveLock = getLockKeyForJob("upsert-live-fixtures");
    expect(recoveryLock).not.toBe(liveLock);
  });

  it("does NOT share a lock key with upcoming-fixtures or finished-fixtures", () => {
    const recoveryLock = getLockKeyForJob("recovery-overdue-fixtures");
    expect(recoveryLock).not.toBe(getLockKeyForJob("upsert-upcoming-fixtures"));
    expect(recoveryLock).not.toBe(getLockKeyForJob("finished-fixtures"));
  });
});

describe("Fix 2: live-fixtures job has no overdue recovery responsibility", () => {
  it("live-fixtures key is distinct from recovery key", () => {
    expect(LIVE_FIXTURES_JOB.key).not.toBe(RECOVERY_OVERDUE_FIXTURES_JOB.key);
  });
});
