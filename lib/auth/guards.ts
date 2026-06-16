import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

function signInUrl(redirectTo: string): string {
  return `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`;
}

function verifyEmailUrl(redirectTo: string): string {
  return `/verify-email?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export async function requireUser(redirectTo: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(signInUrl(redirectTo));
  }

  return user;
}

export async function requireVerifiedUser(redirectTo: string) {
  const user = await requireUser(redirectTo);
  if (!user.emailVerifiedAt) {
    redirect(verifyEmailUrl(redirectTo));
  }

  return user;
}
