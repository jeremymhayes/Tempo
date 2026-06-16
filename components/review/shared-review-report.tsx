import Link from "next/link";
import type { ParsedGame } from "@/types/chess";
import type { OpeningBreakdown } from "@/lib/chess/openings";
import { CLASS_META } from "@/lib/review/classification-meta";
import {
  shouldShowMoveIcon,
  toMovePairs,
  type ReviewListMove,
} from "@/lib/review/review-stats";
import type { ReviewSnapshot } from "@/lib/review/snapshot";
import { AnalysisBoard } from "@/components/chess/analysis-board";
import { EvalGraph } from "./eval-graph";
import { OpeningBreakdownPanel } from "./opening-breakdown";

function formatNumber(value?: number, digits = 1) {
  return typeof value === "number" ? value.toFixed(digits) : "--";
}

function snapshotMoves(game: ParsedGame, snapshot: ReviewSnapshot): ReviewListMove[] {
  const snapshotByPly = new Map(snapshot.moves.map((move) => [move.ply, move]));
  return game.moves.map((move) => {
    const saved = snapshotByPly.get(move.ply);
    return saved
      ? {
          ...move,
          classification: saved.classification,
          centipawnLoss: saved.centipawnLoss,
        }
      : move;
  });
}

export function SharedReviewReport({
  game,
  opening,
  snapshot,
}: {
  game: ParsedGame;
  opening: OpeningBreakdown;
  snapshot: ReviewSnapshot;
}) {
  const moves = snapshotMoves(game, snapshot);
  const pairs = toMovePairs(moves);
  const boardFen = moves.find((move) =>
    ["mistake", "blunder"].includes(move.classification ?? ""),
  )?.fenAfter ?? game.initialFen;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-zinc-800 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <Link href="/" className="text-sm font-semibold text-zinc-100">
              Tempo
            </Link>
            <h1 className="mt-2 truncate text-xl font-semibold">
              {game.white} vs {game.black}
            </h1>
            <p className="text-sm text-zinc-500">
              {game.result} {game.datePlayed ? `· ${game.datePlayed}` : ""}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Import PGN
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(360px,480px)_1fr]">
        <section className="space-y-4">
          <div className="max-w-[480px]">
            <AnalysisBoard fen={boardFen} />
          </div>
          <OpeningBreakdownPanel opening={opening} />
        </section>

        <section className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-zinc-800 bg-zinc-950 p-4">
              <p className="truncate text-sm text-zinc-500">{game.white}</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums">
                {formatNumber(snapshot.stats.accuracy.white)}
              </p>
              <p className="text-sm text-zinc-500">
                Elo {formatNumber(snapshot.stats.rating.white, 0)}
              </p>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 p-4">
              <p className="truncate text-sm text-zinc-500">{game.black}</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums">
                {formatNumber(snapshot.stats.accuracy.black)}
              </p>
              <p className="text-sm text-zinc-500">
                Elo {formatNumber(snapshot.stats.rating.black, 0)}
              </p>
            </div>
          </div>

          <EvalGraph moves={moves} evalByPly={{}} currentPly={-1} />

          <div className="overflow-hidden border border-zinc-800 bg-zinc-950">
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold">Move List</h2>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              <div className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)]">
                {pairs.map((pair) => (
                  <div key={pair.moveNumber} className="contents">
                    <span className="border-b border-zinc-800 px-2 py-1.5 text-right font-mono text-xs text-zinc-600">
                      {pair.moveNumber}.
                    </span>
                    <ReportMoveCell move={pair.white} />
                    <ReportMoveCell move={pair.black} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ReportMoveCell({ move }: { move?: ReviewListMove }) {
  if (!move) return <span className="border-b border-zinc-800" />;
  const meta = move.classification ? CLASS_META[move.classification] : null;
  const showIcon = shouldShowMoveIcon(move.classification);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_24px] border-b border-zinc-800 px-2 py-1.5 font-mono text-sm text-zinc-300">
      <span className="truncate">{move.san}</span>
      {showIcon && meta ? (
        <span
          className="text-right text-[11px] font-black"
          style={{ color: meta.hex }}
        >
          {meta.symbol}
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}
