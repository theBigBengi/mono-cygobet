// src/auth/user-tokens.ts
import type { FastifyInstance } from "fastify";
import { USER_ACCESS_TOKEN_TTL_MS } from "../constants/user-auth.constants";
import { sha256Hex, generateRandomToken } from "../utils/crypto";
import {
  USER_REFRESH_TOKEN_BYTES,
  USER_REFRESH_TOKEN_TTL_MS,
} from "../constants/user-auth.constants";

/**
 * Access token payload (JWT)
 */
export type AccessTokenPayload = {
  sub: number; // userId
  role: string;
  iat?: number;
  exp?: number;
};

/**
 * Generate JWT access token for user
 */
export function generateAccessToken(
  fastify: FastifyInstance,
  userId: number,
  role: string,
): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
  };

  // Enforce TTL: convert milliseconds to seconds for expiresIn
  const expiresInSeconds = Math.floor(USER_ACCESS_TOKEN_TTL_MS / 1000);

  return fastify.jwt.sign(payload, { expiresIn: expiresInSeconds });
}

/**
 * Verify and decode JWT access token
 */
export function verifyAccessToken(
  fastify: FastifyInstance,
  token: string
): AccessTokenPayload {
  try {
    const decoded = fastify.jwt.verify<AccessTokenPayload>(token);
    return decoded;
  } catch (err) {
    throw new Error("Invalid or expired access token");
  }
}

/**
 * Generate random refresh token (raw, to be sent to client)
 */
export function generateRefreshToken(): string {
  return generateRandomToken(USER_REFRESH_TOKEN_BYTES);
}

/**
 * Hash refresh token for storage in DB
 */
export function hashRefreshToken(rawToken: string): string {
  return sha256Hex(rawToken);
}

/**
 * Compute refresh token expiry date
 */
export function computeRefreshTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + USER_REFRESH_TOKEN_TTL_MS);
}
