import { NextRequest, NextResponse } from "next/server";
import { buildAppUrl, verifyEmailToken } from "@/lib/auth/email-verification";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(buildAppUrl(path));
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = await verifyEmailToken(token);

  if (!result.ok) {
    return redirectTo(`/verify-email?status=${result.status}`);
  }

  const response = redirectTo("/?verified=1");
  setSessionCookie(response, await createSession(result.user.id));

  return response;
}
