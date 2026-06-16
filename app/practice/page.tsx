import { AppShell } from "@/components/layout/app-shell";
import { PracticeClient } from "@/components/practice/practice-client";

export const dynamic = "force-dynamic";

export default function PracticePage() {
  return (
    <AppShell title="Practice" description="Play a bot game and review it">
      <PracticeClient />
    </AppShell>
  );
}
