// src/utils/crypto.ts
/**
 * Shared cryptographic utilities for both admin and user auth.
 * These are generic helpers that can be reused across auth systems.
 */
import crypto from "node:crypto";

/**
 * Compute SHA-256 hash of input string, returns hex string.
 */
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generate random token as hex string.
 * @param bytes - Number of random bytes to generate (default: 32)
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

