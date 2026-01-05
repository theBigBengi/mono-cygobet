import "fastify";

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
  }
}
