/**
 * Job key → lock key mapping for distributed advisory locks.
 *
 * One logical lock per heavy operation: cron jobs and admin sync routes
 * that touch the same data share the same lock key.
 */

const JOB_KEY_TO_LOCK_KEY: Record<string, string> = {
  "upsert-upcoming-fixtures": "sync:fixtures",
  "upsert-live-fixtures": "sync:live-fixtures",
  "finished-fixtures": "sync:fixtures",
  "update-prematch-odds": "sync:odds",
  "cleanup-expired-sessions": "cleanup-expired-sessions",
  "sync-group-fixtures": "sync:group-fixtures",
};

/**
 * Returns the advisory lock key for a given job key.
 * Used by scheduler, admin job actions, and CLI so they all use the same lock.
 */
export function getLockKeyForJob(jobKey: string): string {
  return JOB_KEY_TO_LOCK_KEY[jobKey] ?? jobKey;
}
