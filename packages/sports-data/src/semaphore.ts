export class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {
    if (maxConcurrency < 1) throw new Error("maxConcurrency must be >= 1");
  }

  async acquire(timeoutMs?: number): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const onPermit = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        this.running++;
        resolve();
      };

      this.queue.push(onPermit);

      if (timeoutMs != null && timeoutMs > 0) {
        timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          const idx = this.queue.indexOf(onPermit);
          if (idx !== -1) this.queue.splice(idx, 1);
          reject(new Error(`Semaphore acquire timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }

  /** Run fn() while holding a permit. Releases on completion or error. */
  async run<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T> {
    await this.acquire(timeoutMs);
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  getStats(): {
    running: number;
    queued: number;
    maxConcurrency: number;
  } {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrency: this.maxConcurrency,
    };
  }
}
