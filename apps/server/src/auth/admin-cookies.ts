// src/auth/admin-cookies.ts
import type { FastifyReply } from "fastify";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_PATH,
} from "../constants/admin-auth.constants";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function parseBoolEnv(v: string | undefined, defaultValue: boolean): boolean {
  if (v == null) return defaultValue;
  const s = v.trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return defaultValue;
}

function getAdminCookieSameSite(): "lax" | "none" | "strict" {
  const v = (process.env.ADMIN_COOKIE_SAMESITE ?? "").trim().toLowerCase();
  if (v === "none") return "none";
  if (v === "strict") return "strict";
  // Always use "none" for cross-origin admin authentication
  return "none";
}

function getAdminCookieSecure(sameSite: "lax" | "none" | "strict"): boolean {
  // Always secure when SameSite=None (browser requirement)
  if (sameSite === "none") return true;
  // Default: secure in prod for other sameSite values
  return parseBoolEnv(process.env.ADMIN_COOKIE_SECURE, isProd());
}

export function setAdminSessionCookie(
  reply: FastifyReply,
  rawToken: string,
  expires: Date
): void {
  //   const sameSite = getAdminCookieSameSite();
  //   const secure = getAdminCookieSecure(sameSite);
  reply.setCookie(ADMIN_SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_SESSION_COOKIE_PATH,
    expires,
  });
}

export function clearAdminSessionCookie(reply: FastifyReply): void {
  // NOTE: `clearCookie` must match at least the path, and in some deployments secure/sameSite too.
  const sameSite = getAdminCookieSameSite();
  const secure = getAdminCookieSecure(sameSite);
  reply.clearCookie(ADMIN_SESSION_COOKIE_NAME, {
    path: ADMIN_SESSION_COOKIE_PATH,
    httpOnly: true,
    sameSite,
    secure,
  });
}
