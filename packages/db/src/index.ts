import { PrismaClient } from "@prisma/client";

const DEFAULT_CONNECTION_LIMIT = 50;

/**
 * Ensure the DATABASE_URL includes a `connection_limit` parameter.
 * If the URL already specifies one (e.g. set by the hosting provider), we respect it.
 * Otherwise we apply our default to avoid Prisma's low built-in default (~5-10).
 */
function withConnectionLimit(
  url: string | undefined,
  limit: number
): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(limit));
    }
    return parsed.toString();
  } catch {
    // If the URL can't be parsed (e.g. unix socket), return as-is
    return url;
  }
}

const databaseUrl = withConnectionLimit(
  process.env.DATABASE_URL,
  DEFAULT_CONNECTION_LIMIT
);

export const prisma = new PrismaClient({
  log: ["warn", "error"],
  ...(databaseUrl && {
    datasources: {
      db: { url: databaseUrl },
    },
  }),
});

export * from "@prisma/client";
