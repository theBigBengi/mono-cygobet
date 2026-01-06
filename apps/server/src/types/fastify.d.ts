import "fastify";
import type { preHandlerHookHandler, FastifyRequest } from "fastify";
import type { AdminAuthContext } from "../auth/admin-auth.types";

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
  }
}
