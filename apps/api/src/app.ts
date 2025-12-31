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
      properties: {},
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
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://mono-cygobet-admin.vercel.app",
      ],
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
      maxDepth: 3, // Allow loading from subdirectories (e.g., routes/admin/db/, routes/admin/provider/)
      forceESM: true,
    });
  } catch (err) {
    console.error("Error in app plugin:", err);
    throw err;
  }
};

export default app;
export { app, options };
