/**
 * Advisory locking only. pg is used solely for pg_try_advisory_lock / pg_advisory_unlock;
 * all other DB access stays in Prisma.
 */
import pg from "pg";

const { Client } = pg;

/** Default timeout for lock-held work (2 hours). Exported for callers. */
export const DEFAULT_LOCK_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/**
 * Thrown when the advisory lock could not be acquired (another process holds it).
 * Callers can check `err instanceof AdvisoryLockNotAcquiredError` and respond with 409 or log + exit.
 */
export class AdvisoryLockNotAcquiredError extends Error {
  constructor(
    public readonly jobKey: string,
    message = `Advisory lock not acquired for job key: ${jobKey}`
  ) {
    super(message);
    this.name = "AdvisoryLockNotAcquiredError";
    Object.setPrototypeOf(this, AdvisoryLockNotAcquiredError.prototype);
  }
}

/**
 * Thrown when the caller's timeout (options.timeoutMs) elapsed before fn() completed.
 * The lock is NOT released on timeout; it is released only after fn() finishes.
 * Timeout only rejects the caller's Promise; mutual exclusion is preserved.
 */
export class AdvisoryLockTimeoutError extends Error {
  constructor(
    public readonly jobKey: string,
    public readonly timeoutMs: number,
    message = `Advisory lock timed out after ${timeoutMs}ms for job key: ${jobKey}`
  ) {
    super(message);
    this.name = "AdvisoryLockTimeoutError";
    Object.setPrototypeOf(this, AdvisoryLockTimeoutError.prototype);
  }
}

/**
 * Session-scoped advisory lock: acquire with pg_try_advisory_lock, run fn(), then
 * release with pg_advisory_unlock in finally. The lock is never released before fn() completes.
 *
 * If options.timeoutMs is set, the caller's Promise is rejected after that many ms
 * (AdvisoryLockTimeoutError), but the lock is released only after fn() actually finishes.
 * clearTimeout is always performed so the timer does not leak.
 *
 * @param jobKey - Logical lock key (e.g. "sync:fixtures", "sync:odds")
 * @param fn - Work to run while holding the lock
 * @param options.timeoutMs - If set, caller gets AdvisoryLockTimeoutError after this many ms; lock still held until fn() completes.
 * @returns The result of `fn()`
 * @throws AdvisoryLockNotAcquiredError if the lock is already held by another session
 * @throws AdvisoryLockTimeoutError if options.timeoutMs elapsed before fn() completed (lock not released until fn() finishes)
 */
export async function withAdvisoryLock<T>(
  jobKey: string,
  fn: (signal?: AbortSignal) => Promise<T>,
  options?: { timeoutMs?: number }
): Promise<T> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for advisory lock (withAdvisoryLock)"
    );
  }

  const timeoutMs = options?.timeoutMs;
  const client = new Client({ connectionString });
  let timedOut = false;

  async function releaseLockAndClose(): Promise<void> {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
        jobKey,
      ]);
    } catch {
      // Ignore unlock errors (e.g. connection already closed)
    }
    try {
      await client.end();
    } catch {
      // Ignore end errors; ensure we don't leak the client
    }
  }

  try {
    await client.connect();
    const lockResult = await client.query<{ ok: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext($1)) as ok",
      [jobKey]
    );
    const acquired = lockResult.rows[0]?.ok;
    if (!acquired) {
      throw new AdvisoryLockNotAcquiredError(jobKey);
    }

    if (timeoutMs != null && timeoutMs > 0) {
      const controller = new AbortController();
      const workPromise = fn(controller.signal);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timerPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
          workPromise.catch(() => {}).finally(() => releaseLockAndClose());
          reject(new AdvisoryLockTimeoutError(jobKey, timeoutMs));
        }, timeoutMs);
      });
      try {
        return await Promise.race([workPromise, timerPromise]);
      } finally {
        if (timeoutId != null) clearTimeout(timeoutId);
      }
    }

    return await fn();
  } finally {
    if (!timedOut) {
      await releaseLockAndClose();
    }
  }
}
