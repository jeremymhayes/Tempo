import { getPrisma } from "@/lib/db";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth/crypto";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

export type AuthResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; error: string; status: number };

function validatePassword(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return "Password is too long.";
  }

  return null;
}

export async function createAccount(
  rawEmail: unknown,
  rawPassword: unknown,
): Promise<AuthResult> {
  if (typeof rawEmail !== "string") {
    return { ok: false, error: "Email is required.", status: 400 };
  }

  const emailResult = normalizeEmail(rawEmail);
  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error, status: 400 };
  }

  const passwordError = validatePassword(rawPassword);
  if (passwordError) {
    return { ok: false, error: passwordError, status: 400 };
  }

  try {
    const user = await getPrisma().user.create({
      data: {
        email: emailResult.email,
        passwordHash: await hashPassword(rawPassword as string),
      },
      select: {
        id: true,
        email: true,
      },
    });

    return { ok: true, user };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error: "An account with that email already exists.",
        status: 409,
      };
    }

    throw error;
  }
}

export async function authenticateAccount(
  rawEmail: unknown,
  rawPassword: unknown,
): Promise<AuthResult> {
  if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
    return { ok: false, error: "Invalid email or password.", status: 401 };
  }

  const emailResult = normalizeEmail(rawEmail);
  if (!emailResult.ok) {
    return { ok: false, error: "Invalid email or password.", status: 401 };
  }

  const user = await getPrisma().user.findUnique({
    where: { email: emailResult.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPassword(rawPassword, user.passwordHash))) {
    return { ok: false, error: "Invalid email or password.", status: 401 };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
