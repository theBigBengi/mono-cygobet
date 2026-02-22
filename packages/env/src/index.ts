import dotenv from "dotenv";
import path from "path";

/**
 * Load environment variables with NODE_ENV awareness.
 *
 * Loading order (first value wins — dotenv never overwrites):
 *   1. Process env vars (set by the deployment platform) — already in process.env
 *   2. `.env.{NODE_ENV}` — environment-specific overrides (e.g. .env.development)
 *   3. `.env` — shared defaults / fallback
 *
 * Usage:
 *   - Local dev:  put DATABASE_URL in `.env` (or `.env.development`)
 *   - Production: set DATABASE_URL on the hosting platform (Render, Vercel, etc.)
 *   - The `.env` file is always loaded as a fallback for non-sensitive defaults.
 */
const NODE_ENV = process.env.NODE_ENV || "development";
const root = process.cwd();

dotenv.config({ path: path.join(root, `.env.${NODE_ENV}`) });
dotenv.config({ path: path.join(root, ".env") });
