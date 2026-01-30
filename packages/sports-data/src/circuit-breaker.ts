import type { SportsDataLogger } from "./logger";
import { noopLogger } from "./logger";
import { SportsDataError } from "./errors";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerOptions = {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** How long to stay open before trying half-open (ms) */
  resetTimeoutMs: number;
  logger?: SportsDataLogger;
  name?: string;
};

const DEFAULTS: Pick<CircuitBreakerOptions, "failureThreshold" | "resetTimeoutMs"> = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
};

export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly opts: CircuitBreakerOptions;
  private readonly logger: SportsDataLogger;
  private readonly name: string;

  constructor(opts: Partial<CircuitBreakerOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    this.logger = opts.logger ?? noopLogger;
    this.name = opts.name ?? "unnamed";
  }

  /**
   * Call before fetch. Throws if circuit is OPEN and reset timeout has not passed.
   */
  assertClosed(): void {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.opts.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.logger.info("Circuit breaker half-open (attempting probe)", {
          name: this.name,
          elapsedMs: elapsed,
        });
      } else {
        throw new SportsDataError(
          "CIRCUIT_OPEN",
          "Circuit breaker is open",
          undefined
        );
      }
    }
  }

  /**
   * Call after 2xx response.
   */
  recordSuccess(): void {
    if (this.state === "CLOSED" || this.state === "HALF_OPEN") {
      if (this.state === "HALF_OPEN") {
        this.logger.info("Circuit breaker closed (probe succeeded)", {
          name: this.name,
        });
      }
      this.failureCount = 0;
      this.state = "CLOSED";
    }
  }

  /**
   * Call after 5xx or network error.
   */
  recordFailure(): void {
    if (this.state === "CLOSED") {
      this.failureCount++;
      if (this.failureCount >= this.opts.failureThreshold) {
        this.state = "OPEN";
        this.lastFailureTime = Date.now();
        this.logger.warn("Circuit breaker opened", {
          name: this.name,
          failureCount: this.failureCount,
          threshold: this.opts.failureThreshold,
        });
      }
    } else if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.lastFailureTime = Date.now();
      this.logger.warn("Circuit breaker re-opened (half-open probe failed)", {
        name: this.name,
      });
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailureTime: number;
    name: string;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      name: this.name,
    };
  }

  /**
   * Reset to CLOSED (for tests).
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
  }
}
