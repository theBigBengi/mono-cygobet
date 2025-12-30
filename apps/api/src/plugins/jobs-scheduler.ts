import fp from "fastify-plugin";
import cron from "node-cron";

// simple in-memory locks so the same job doesn't overlap
const running: Record<string, boolean> = {};

type JobFn = () => Promise<void> | void;

function guard(key: string, fn: JobFn): JobFn {
  return async () => {
    if (running[key]) return;
    running[key] = true;
    try {
      await fn();
    } finally {
      running[key] = false;
    }
  };
}

export default fp(async (fastify) => {
  // schedule definitions (edit as you like)
  const tasks = [
    {
      key: "live-fixtures",
      cron: "*/1 * * * *", // every 5 min
      fn: guard("live-fixtures", async () => {
        console.log("live-fixtures");
      }),
    },
  ];

  // start schedules when server is ready
  fastify.addHook("onReady", async () => {
    for (const t of tasks) {
      const task = cron.schedule(t.cron, t.fn);
      // stop them on server close
      fastify.addHook("onClose", async () => task.stop());
    }
    fastify.log.info("✅ Job scheduler started");
  });
});
