import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" description="Local preferences for the reviewer">
      <SettingsForm />
    </AppShell>
  );
}
