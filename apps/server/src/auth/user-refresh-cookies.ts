// src/auth/user-refresh-cookies.ts
// HttpOnly cookie for user refresh token (Expo Web only). Not used on native.
import type { FastifyReply } from "fastify";
import {
  USER_REFRESH_COOKIE_NAME,
  USER_REFRESH_COOKIE_PATH,
} from "../constants/user-auth.constants";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

export function setUserRefreshCookie(
  reply: FastifyReply,
  refreshToken: string,
  expires: Date
): void {
  reply.setCookie(USER_REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: USER_REFRESH_COOKIE_PATH,
    expires,
  });
}

export function clearUserRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(USER_REFRESH_COOKIE_NAME, {
    path: USER_REFRESH_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
  });
}
