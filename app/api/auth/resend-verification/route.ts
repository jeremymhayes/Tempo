import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { sendVerificationEmailForUser } from "@/lib/email/verification-email";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Authentication required", 401);
  }

  const result = await sendVerificationEmailForUser(user.id);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return NextResponse.json({
    sent: result.sent,
    alreadyVerified: "alreadyVerified" in result ? result.alreadyVerified : false,
  });
}
