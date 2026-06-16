import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = await verifyEmailToken(token);

  if (!result.ok) {
    return redirectTo(request, `/verify-email?status=${result.status}`);
  }

  const response = redirectTo(request, "/?verified=1");
  setSessionCookie(response, await createSession(result.user.id));

  return response;
}
