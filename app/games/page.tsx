import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GamesTable } from "@/components/games/games-table";
import { EmptyState } from "@/components/ui/empty-state";
import { toSavedGameSummary } from "@/lib/api/games";
import { listGameSummaries } from "@/lib/games/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?redirectTo=/games");
  }

  const games = (await listGameSummaries(user.id)).map(toSavedGameSummary);

  return (
    <AppShell title="Past Games" description="Games you've saved to revisit">
      {games.length === 0 ? (
        <EmptyState
          icon={<Crown className="size-8" />}
          title="No saved games yet"
          description="Saved PGNs will appear here after you import them."
        />
      ) : (
        <GamesTable games={games} />
      )}
    </AppShell>
  );
}
