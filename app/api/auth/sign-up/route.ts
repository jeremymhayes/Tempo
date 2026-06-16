import { NextRequest, NextResponse } from "next/server";
import { createAccount } from "@/lib/auth/accounts";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { sendVerificationEmailForUser } from "@/lib/email/verification-email";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const email =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { email?: unknown }).email
      : undefined;
  const password =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { password?: unknown }).password
      : undefined;

  const result = await createAccount(email, password);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const verificationEmail = await sendVerificationEmailForUser(result.user.id);
  const response = NextResponse.json(
    {
      user: result.user,
      requiresEmailVerification: true,
      verificationEmailSent: verificationEmail.ok && verificationEmail.sent,
      verificationEmailError: verificationEmail.ok
        ? null
        : verificationEmail.error,
    },
    { status: 201 },
  );
  setSessionCookie(response, await createSession(result.user.id));

  return response;
}
