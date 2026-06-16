import { randomBytes } from "node:crypto";

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function createShareToken(): string {
  return randomBytes(24).toString("base64url").slice(0, 32);
}

export function isValidShareToken(token: string): boolean {
  return SHARE_TOKEN_PATTERN.test(token);
}
