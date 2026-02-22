/**
 * Advisory locking using transaction-level locks (pg_try_advisory_xact_lock).
 * The lock is held inside a BEGIN/COMMIT transaction on a dedicated pg.Client.
 * It auto-releases when the transaction ends — even on crash or connection drop.
 *
 * All other DB access stays in Prisma; pg is used solely for the advisory lock.
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
 * Transaction-scoped advisory lock: opens a dedicated pg connection, BEGINs a
 * transaction, acquires the lock with pg_try_advisory_xact_lock, runs fn(),
 * then COMMITs (releasing the lock). If anything goes wrong the transaction is
 * rolled back and the lock is released automatically.
 *
 * If options.timeoutMs is set, the caller's Promise is rejected after that many ms
 * (AdvisoryLockTimeoutError), but the lock is released only after fn() finishes.
 *
 * @param jobKey - Logical lock key (e.g. "sync:fixtures", "sync:odds")
 * @param fn - Work to run while holding the lock
 * @param options.timeoutMs - If set, caller gets AdvisoryLockTimeoutError after this many ms
 * @returns The result of `fn()`
 * @throws AdvisoryLockNotAcquiredError if the lock is already held
 * @throws AdvisoryLockTimeoutError if options.timeoutMs elapsed before fn() completed
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

  async function endTransaction(): Promise<void> {
    try {
      await client.query("COMMIT");
    } catch {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Connection is likely dead — lock auto-releases with the transaction
      }
    }
    try {
      await client.end();
    } catch {
      // Ignore; connection may already be closed
    }
  }

  await client.connect();

  try {
    await client.query("BEGIN");

    const lockResult = await client.query<{ ok: boolean }>(
      "SELECT pg_try_advisory_xact_lock(hashtext($1)) as ok",
      [jobKey]
    );
    const acquired = lockResult.rows[0]?.ok;
    if (!acquired) {
      await endTransaction();
      throw new AdvisoryLockNotAcquiredError(jobKey);
    }

    if (timeoutMs != null && timeoutMs > 0) {
      let timedOut = false;
      const controller = new AbortController();
      const workPromise = fn(controller.signal);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timerPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
          workPromise
            .catch(() => {})
            .finally(() => endTransaction());
          reject(new AdvisoryLockTimeoutError(jobKey, timeoutMs));
        }, timeoutMs);
      });
      try {
        const result = await Promise.race([workPromise, timerPromise]);
        if (!timedOut) await endTransaction();
        return result;
      } finally {
        if (timeoutId != null) clearTimeout(timeoutId);
      }
    }

    const result = await fn();
    await endTransaction();
    return result;
  } catch (err) {
    await endTransaction();
    throw err;
  }
}
