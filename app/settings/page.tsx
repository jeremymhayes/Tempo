import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?redirectTo=/settings");
  }

  return (
    <AppShell title="Settings" description="Local preferences for the reviewer">
      <SettingsForm />
    </AppShell>
  );
}
