import "fastify";
import type { preHandlerHookHandler, FastifyRequest } from "fastify";
import type { AdminAuthContext, UserAuthContext } from "./auth";

declare module "fastify" {
  interface FastifyInstance {
    jobsScheduler?: {
      /**
       * Rebuild schedules for all runnable jobs from DB.
       */
      rescheduleAll: () => Promise<void>;
      /**
       * Reschedule a single job from DB (stop old task, start new one, or stop if cron=null).
       */
      rescheduleJob: (jobKey: string) => Promise<void>;
      /**
       * Stop all scheduled tasks for this process.
       */
      stopAll: () => void;
    };

    adminAuth: {
      resolve: (req: FastifyRequest) => Promise<AdminAuthContext | null>;
      assertAuth: (req: FastifyRequest) => Promise<AdminAuthContext>;
      assertAdmin: (req: FastifyRequest) => Promise<AdminAuthContext>;
      requireAuth: preHandlerHookHandler;
      requireAdmin: preHandlerHookHandler;
    };

    userAuth: {
      resolve: (req: FastifyRequest) => Promise<UserAuthContext | null>;
      assertAuth: (req: FastifyRequest) => Promise<UserAuthContext>;
      requireAuth: preHandlerHookHandler;
      requireOnboardingComplete: preHandlerHookHandler;
    };

    jwt: {
      sign: (payload: Record<string, unknown>) => string;
      verify: <T = Record<string, unknown>>(token: string) => T;
    };
  }

  interface FastifyRequest {
    /**
     * Admin auth context (session + user), resolved from the httpOnly cookie.
     * - null: resolved and unauthenticated
     * - object: resolved and authenticated
     */
    adminAuth: AdminAuthContext | null;
    /**
     * Internal per-request memoization flag to avoid repeated DB lookups.
     */
    adminAuthResolved: boolean;

    /**
     * User auth context (JWT access token), resolved from Authorization header.
     * - null: resolved and unauthenticated
     * - object: resolved and authenticated
     */
    userAuth: UserAuthContext | null;
    /**
     * Internal per-request memoization flag to avoid repeated DB lookups.
     */
    userAuthResolved: boolean;
  }
}
