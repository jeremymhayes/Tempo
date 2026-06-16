import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAppUrl,
  buildEmailVerificationUrl,
  createEmailVerificationToken,
  getEmailVerificationExpiresAt,
  hashEmailVerificationToken,
  isEmailVerificationTokenExpired,
} from "../lib/auth/email-verification";

test("email verification tokens are opaque and hash to sha256 hex", () => {
  const first = createEmailVerificationToken();
  const second = createEmailVerificationToken();

  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.equal(hashEmailVerificationToken(first), hashEmailVerificationToken(first));
  assert.notEqual(hashEmailVerificationToken(first), first);
  assert.match(hashEmailVerificationToken(first), /^[a-f0-9]{64}$/);
});

test("email verification expiry lasts 24 hours", () => {
  const now = new Date("2026-06-16T00:00:00.000Z");
  const expiresAt = getEmailVerificationExpiresAt(now);

  assert.equal(expiresAt.toISOString(), "2026-06-17T00:00:00.000Z");
  assert.equal(isEmailVerificationTokenExpired(expiresAt, now), false);
  assert.equal(
    isEmailVerificationTokenExpired(
      expiresAt,
      new Date("2026-06-17T00:00:00.001Z"),
    ),
    true,
  );
});

test("email verification URL points at the app verify route", () => {
  const url = buildEmailVerificationUrl(
    "token_123",
    "https://chess.jeremymhayes.com/",
  );

  assert.equal(
    url,
    "https://chess.jeremymhayes.com/api/auth/verify-email?token=token_123",
  );
});

test("app redirects use the configured public app URL", () => {
  const url = buildAppUrl(
    "/verify-email?status=invalid",
    "https://chess.jeremymhayes.com/",
  );

  assert.equal(
    url.toString(),
    "https://chess.jeremymhayes.com/verify-email?status=invalid",
  );
});
