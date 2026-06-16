import { AppShell } from "@/components/layout/app-shell";
import { PgnInput } from "@/components/chess/pgn-input";
import { RecentGames } from "@/components/games/recent-games";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const canSave = Boolean(user?.emailVerifiedAt);

  return (
    <AppShell title="Import Game" description="Review a PGN as a guest or save it to your account">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            Tempo
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Paste a game in PGN format or upload a <code className="text-zinc-300">.pgn</code> file,
            then step through every move on an interactive board. Guest reviews
            stay local; verified accounts can save games permanently.
          </p>
          <div className="mt-6">
            <PgnInput canSave={canSave} />
          </div>
        </div>
        {canSave ? (
          <RecentGames />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Guest Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-500">
              <p>
                You can review games without creating an account. Tempo will not
                store guest PGNs in the database.
              </p>
              <p>
                Create and verify an account when you want saved games and a
                persistent review history.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
