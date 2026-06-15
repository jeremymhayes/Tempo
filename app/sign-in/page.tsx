import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const { redirectTo } = await searchParams;

  return (
    <AppShell title="Sign In" description="Access your saved game reviews">
      <AuthForm mode="sign-in" redirectTo={redirectTo || "/"} />
    </AppShell>
  );
}
