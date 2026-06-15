import { NextRequest, NextResponse } from "next/server";
import { authenticateAccount } from "@/lib/auth/accounts";
import { createSession, setSessionCookie } from "@/lib/auth/session";

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

  const result = await authenticateAccount(email, password);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const response = NextResponse.json({ user: result.user });
  setSessionCookie(response, await createSession(result.user.id));

  return response;
}
