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
  // Define a schema for validation (optional but recommended)
  // const schema = {
  //   type: "object",
  //   required: [
  //     "PORT",
  //     "JWT_SECRET",
  //     "GOOGLE_CLIENT_ID",
  //     "GOOGLE_CLIENT_SECRET",
  //     "FB_CLIENT_ID",
  //     "FB_CLIENT_SECRET",
  //   ],
  //   properties: {
  //     PORT: { type: "string", default: "3000" },
  //     JWT_SECRET: { type: "string" },
  //     GOOGLE_CLIENT_ID: { type: "string" },
  //     GOOGLE_CLIENT_SECRET: { type: "string" },
  //     FB_CLIENT_ID: { type: "string" },
  //     FB_CLIENT_SECRET: { type: "string" },
  //     SPORTSMONKS_API_KEY: { type: "string" },
  //     SPORTSMONKS_API_URL: { type: "string" },
  //   },
  // };

  const options = {
    confKey: "config", // config will be available at fastify.config
    // schema,
    dotenv: true, // Load from .env automatically
  };

  await fastify.register(fastifyEnv, options);

  // Register global error handler first
  // registerGlobalErrorHandler(fastify);

  // Register core plugins
  fastify.register(fastifyCookie);
  // fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

  // Register CORS
  fastify.register(fastifyCors, {
    origin: ["http://localhost:3000"],
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
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: opts,
  });

  // Load routes after plugins
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
