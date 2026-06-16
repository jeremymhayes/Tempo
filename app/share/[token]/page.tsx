import { notFound } from "next/navigation";
import { deriveOpeningBreakdown } from "@/lib/chess/openings";
import { isValidShareToken } from "@/lib/games/share-token";
import { getSharedGameDetail } from "@/lib/games/queries";
import { toParsedGame } from "@/lib/api/games";
import { createReviewSnapshot } from "@/lib/review/snapshot";
import { SharedReviewReport } from "@/components/review/shared-review-report";

export const dynamic = "force-dynamic";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidShareToken(token)) {
    notFound();
  }

  const game = await getSharedGameDetail(token);
  if (!game) {
    notFound();
  }

  const parsedGame = toParsedGame(game);
  const snapshot = game.reviewSnapshot ?? createReviewSnapshot(parsedGame);
  const opening = deriveOpeningBreakdown(parsedGame.moves);

  return (
    <SharedReviewReport
      game={parsedGame}
      opening={opening}
      snapshot={snapshot}
    />
  );
}
