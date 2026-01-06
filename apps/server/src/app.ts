import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import fastifyEnv from "@fastify/env";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { FastifyPluginAsync } from "fastify";
// import fastifyJwt from "@fastify/jwt";
import * as path from "path";

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;

function isPrivateIPv4(hostname: string): boolean {
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // 172.16.0.0 - 172.31.255.255
  const m = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (m) {
    const second = Number(m[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  try {
    // Minimal schema for @fastify/env (required by the plugin)
    const schema = {
      type: "object",
      required: [],
      properties: {
        /**
         * Jobs scheduler toggle (cron inside the API process).
         * - Default: enabled
         * - Set to "false"/"0"/"no"/"off" to disable on a given instance
         */
        JOBS_SCHEDULER_ENABLED: { type: "string" },
      },
    };

    const options = {
      confKey: "config", // config will be available at fastify.config
      schema,
      dotenv: true, // Load from .env automatically
    };

    await fastify.register(fastifyEnv, options);

    // Register core plugins
    fastify.register(fastifyCookie);
    // fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

    // Register CORS
    fastify.register(fastifyCors, {
      origin: (origin, cb) => {
        // allow non-browser calls (curl / server-to-server)
        if (!origin) return cb(null, true);

        const isDev = process.env.NODE_ENV !== "production";

        // allow your known origins + any vercel preview
        const isAllowedStatic =
          origin === "http://localhost:3000" ||
          origin === "http://localhost:5173" ||
          origin === "https://mono-cygobet-admin.vercel.app" ||
          (origin.startsWith("https://") && origin.endsWith(".vercel.app"));

        if (isAllowedStatic) {
          // IMPORTANT: echo the exact origin string
          return cb(null, origin);
        }

        // In dev, allow any localhost/loopback (any port) + common LAN IPs for Expo web/dev servers.
        if (isDev) {
          try {
            const u = new URL(origin);
            const host = u.hostname;
            if (
              host === "localhost" ||
              host === "127.0.0.1" ||
              host === "::1"
            ) {
              return cb(null, origin);
            }
            if (isPrivateIPv4(host)) {
              return cb(null, origin);
            }
          } catch {
            // ignore
          }
        }

        // Don't throw (avoids 500). Simply disable CORS for this origin.
        return cb(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    });

    // app.ts (after registering core plugins, before routes)
    fastify.setReplySerializer((payload) => {
      // Keep strings as-is (Fastify may already give a string)
      if (typeof payload === "string") return payload;

      // Convert BigInt values to strings to avoid precision loss
      return JSON.stringify(payload, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );
    });

    // Load plugins
    const pluginsDir = path.join(__dirname, "plugins");
    console.log("Loading plugins from:", pluginsDir);
    await fastify.register(AutoLoad, {
      dir: pluginsDir,
      options: opts,
      forceESM: true,
    });

    // Load routes after plugins
    const routesDir = path.join(__dirname, "routes");
    console.log("Loading routes from:", routesDir);
    await fastify.register(AutoLoad, {
      dir: routesDir,
      options: opts,
      // We nest admin routes under `routes/admin/sync-center/*`, which adds one more directory level.
      // Example: routes/admin/sync-center/db/*.route.ts
      maxDepth: 4,
      forceESM: true,
    });
    // Note: if you add new route folders (e.g. `routes/mobile/*`), you may need to restart `pnpm -F server dev`
    // so the runtime autoload scan picks them up.
  } catch (err) {
    console.error("Error in app plugin:", err);
    throw err;
  }
};

export default app;
export { app, options };
