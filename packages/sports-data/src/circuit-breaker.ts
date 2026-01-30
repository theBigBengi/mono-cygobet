import { SportsDataError } from "./errors";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerOptions = {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** How long to stay open before trying half-open (ms) */
  resetTimeoutMs: number;
};

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
};

export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly opts: CircuitBreakerOptions;

  constructor(opts: Partial<CircuitBreakerOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  /**
   * Call before fetch. Throws if circuit is OPEN and reset timeout has not passed.
   */
  assertClosed(): void {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.opts.resetTimeoutMs) {
        this.state = "HALF_OPEN";
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
      }
    } else if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.lastFailureTime = Date.now();
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Reset to CLOSED (for tests).
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
  }
}
