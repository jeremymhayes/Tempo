import { AppShell } from "@/components/layout/app-shell";
import { PgnInput } from "@/components/chess/pgn-input";
import { RecentGames } from "@/components/games/recent-games";
import { requireVerifiedUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireVerifiedUser("/");

  return (
    <AppShell title="Import Game" description="Paste or upload a PGN to review">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            Free Chess Game Reviewer
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Paste a game in PGN format or upload a <code className="text-zinc-300">.pgn</code> file,
            then step through every move on an interactive board. Games are
            saved to your account. Engine analysis is coming later.
          </p>
          <div className="mt-6">
            <PgnInput />
          </div>
        </div>
        <RecentGames />
      </div>
    </AppShell>
  );
}
