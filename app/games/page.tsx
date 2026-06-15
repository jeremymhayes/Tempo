import { Crown } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GamesTable } from "@/components/games/games-table";
import { EmptyState } from "@/components/ui/empty-state";
import { listSavedGames } from "@/lib/api/games";

export default async function GamesPage() {
  // Stubbed backend call — returns [] until accounts/database exist.
  const games = await listSavedGames();

  return (
    <AppShell title="Past Games" description="Games you've saved to revisit">
      {games.length === 0 ? (
        <EmptyState
          icon={<Crown className="size-8" />}
          title="No saved games yet"
          description="Sign in later to save and revisit reviewed games. Accounts and history aren't built yet."
        />
      ) : (
        <GamesTable games={games} />
      )}
    </AppShell>
  );
}
