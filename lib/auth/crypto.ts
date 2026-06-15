import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const SESSION_TOKEN_BYTES = 32;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NormalizeEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function normalizeEmail(value: string): NormalizeEmailResult {
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { ok: false, error: "Enter a valid email address." };
  }

  return { ok: true, email };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, salt, storedKeyHex] = encodedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedKeyHex) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyHex, "hex");
  if (storedKey.length !== KEY_LENGTH) {
    return false;
  }

  const candidateKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(storedKey, candidateKey);
}

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
