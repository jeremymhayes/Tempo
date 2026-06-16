import { redirect } from "next/navigation";
import { getCurrentUser, type AuthUser } from "@/lib/auth/session";

/**
 * Admin allowlist is configured via the `ADMIN_EMAILS` env var: a
 * comma-separated list of email addresses, e.g.
 *   ADMIN_EMAILS="jeremyhayesmatthew@gmail.com,someone@else.com"
 */
function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.trim().toLowerCase());
}

/** Returns the current user only if they are an admin, otherwise null. */
export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return user && isAdminEmail(user.email) ? user : null;
}

/**
 * Guard for admin-only pages and Server Actions. Redirects unauthenticated
 * users to sign-in and non-admins to the home page.
 */
export async function requireAdmin(redirectTo = "/admin"): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

  return user;
}
