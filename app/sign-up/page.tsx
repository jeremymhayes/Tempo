import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.emailVerifiedAt ? "/" : "/verify-email");
  }

  return (
    <AppShell title="Create Account" description="Save games privately in Tempo">
      <AuthForm mode="sign-up" />
    </AppShell>
  );
}
