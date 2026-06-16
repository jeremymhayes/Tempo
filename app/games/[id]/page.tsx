import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewClient } from "@/components/review/review-client";
import { getGameDetail } from "@/lib/games/queries";
import { toParsedGame } from "@/lib/api/games";
import { requireVerifiedUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SavedGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireVerifiedUser(`/games/${encodeURIComponent(id)}`);

  const game = await getGameDetail(id, user.id);

  if (!game) {
    notFound();
  }

  const parsedGame = toParsedGame(game);

  return (
    <AppShell
      title="Review"
      description={`${parsedGame.white} vs ${parsedGame.black}`}
    >
      <ReviewClient initialGame={parsedGame} />
    </AppShell>
  );
}
