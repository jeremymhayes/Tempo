import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;

export type EmailVerificationUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
};

export type VerifyEmailTokenResult =
  | { ok: true; user: EmailVerificationUser }
  | { ok: false; status: "invalid" | "expired" };

export function createEmailVerificationToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getEmailVerificationExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_MS);
}

export function isEmailVerificationTokenExpired(
  expiresAt: Date,
  now = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

export function buildAppUrl(path: string, baseUrl = getAppUrl()): URL {
  return new URL(path, baseUrl);
}

export function buildEmailVerificationUrl(
  token: string,
  baseUrl = getAppUrl(),
): string {
  const url = buildAppUrl("/api/auth/verify-email", baseUrl);
  url.searchParams.set("token", token);

  return url.toString();
}

export async function issueEmailVerificationToken(
  userId: string,
  now = new Date(),
): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
  const token = createEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = getEmailVerificationExpiresAt(now);
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    }),
  ]);

  return { token, tokenHash, expiresAt };
}

export async function getLatestEmailVerificationTokenCreatedAt(
  userId: string,
): Promise<Date | null> {
  const token = await getPrisma().emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return token?.createdAt ?? null;
}

export async function verifyEmailToken(
  rawToken: unknown,
  now = new Date(),
): Promise<VerifyEmailTokenResult> {
  if (typeof rawToken !== "string" || rawToken.length < 32) {
    return { ok: false, status: "invalid" };
  }

  const tokenHash = hashEmailVerificationToken(rawToken);
  const prisma = getPrisma();
  const token = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!token) {
    return { ok: false, status: "invalid" };
  }

  if (isEmailVerificationTokenExpired(token.expiresAt, now)) {
    await prisma.emailVerificationToken
      .delete({ where: { tokenHash } })
      .catch(() => {});
    return { ok: false, status: "expired" };
  }

  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const verifiedUser = token.user.emailVerifiedAt
      ? token.user
      : await tx.user.update({
          where: { id: token.userId },
          data: { emailVerifiedAt: now },
          select: {
            id: true,
            email: true,
            emailVerifiedAt: true,
          },
        });

    await tx.emailVerificationToken.deleteMany({
      where: { userId: token.userId },
    });

    return verifiedUser;
  });

  return { ok: true, user };
}
