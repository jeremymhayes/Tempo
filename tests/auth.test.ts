import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  hashSessionToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "../lib/auth/crypto";

test("normalizeEmail lowercases and trims valid email addresses", () => {
  const result = normalizeEmail("  Player@Example.COM  ");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.email, "player@example.com");
});

test("normalizeEmail rejects malformed email addresses", () => {
  const result = normalizeEmail("not-an-email");

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /email/i);
});

test("password hashes verify only the original password", async () => {
  const hash = await hashPassword("correct horse battery staple");

  assert.match(hash, /^scrypt:/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("session token hashing is deterministic and does not expose the token", () => {
  const token = createSessionToken();
  const hash = hashSessionToken(token);

  assert.notEqual(hash, token);
  assert.equal(hashSessionToken(token), hash);
  assert.match(hash, /^[a-f0-9]{64}$/);
});
