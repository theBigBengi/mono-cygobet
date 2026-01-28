import "dotenv/config";
import * as bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import { getLogger } from "../logger";

const log = getLogger("CreateAdmin");

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const email =
    arg("--email") ??
    process.env.ADMIN_EMAIL ??
    process.env.SEED_ADMIN_EMAIL ??
    "";
  const password =
    arg("--password") ??
    process.env.ADMIN_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    "";
  const name = arg("--name") ?? process.env.ADMIN_NAME ?? null;
  const verified =
    hasFlag("--verified") ||
    hasFlag("--email-verified") ||
    process.env.ADMIN_EMAIL_VERIFIED === "true" ||
    process.env.SEED_ADMIN_EMAIL_VERIFIED === "true";

  if (!email || !password) {
    throw new Error(
      "Missing --email/--password (or ADMIN_EMAIL/ADMIN_PASSWORD env vars)."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "Password must be at least 8 characters (must match admin login validation)."
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const user = await prisma.users.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      name,
      password: passwordHash,
      role: "admin",
      emailVerifiedAt: verified ? now : null,
    },
    update: {
      name,
      password: passwordHash,
      role: "admin",
      ...(verified ? { emailVerifiedAt: now } : {}),
    },
    select: { id: true, email: true, role: true, name: true },
  });

  log.info({ user }, "Admin user ready");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    log.error({ err }, "Create admin failed");
    await prisma.$disconnect();
    process.exit(1);
  });
