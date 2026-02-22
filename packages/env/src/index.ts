import dotenv from "dotenv";
import path from "path";
import fs from "fs";

/**
 * Load environment variables with NODE_ENV awareness.
 *
 * Loading order (first value wins — dotenv never overwrites):
 *   1. Process env vars (set by the deployment platform) — already in process.env
 *   2. `.env.{NODE_ENV}` — environment-specific overrides (e.g. .env.development)
 *   3. `.env` — shared defaults / fallback
 *
 * The monorepo root is resolved by walking up from cwd until
 * pnpm-workspace.yaml is found, so this works regardless of
 * which package triggers the import.
 */
function findMonorepoRoot(from: string): string {
  let dir = from;
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return from; // reached filesystem root, fallback to cwd
    dir = parent;
  }
}

const NODE_ENV = process.env.NODE_ENV || "development";
const root = findMonorepoRoot(process.cwd());

dotenv.config({ path: path.join(root, `.env.${NODE_ENV}`) });
dotenv.config({ path: path.join(root, ".env") });
