"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileX2 } from "lucide-react";
import type { ParsedGame, PieceColor } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import { loadCurrentGame } from "@/lib/storage";
import {
  START_PLY,
  fenAtPly,
  isAtEnd,
  isAtStart,
  lastMoveSquares,
  nextPly,
  prevPly,
} from "@/lib/chess/game-navigation";
import { ChessboardViewer } from "@/components/chess/chessboard-viewer";
import { MoveList } from "./move-list";
import { MoveControls } from "./move-controls";
import { GameSummary } from "./game-summary";
import { MoveDetails } from "./move-details";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function ReviewClient({
  initialGame,
}: {
  initialGame?: ParsedGame | null;
}) {
  const hasInitialGame = initialGame !== undefined;
  const [game, setGame] = useState<ParsedGame | null>(initialGame ?? null);
  const [loaded, setLoaded] = useState(hasInitialGame);
  const [ply, setPly] = useState(START_PLY);

  // Read the game stashed by the import page (sessionStorage survives refresh).
  // Done in an effect, not lazy init, so server and client first render match
  // (window is undefined during prerender). The cascading-render warning is
  // expected and harmless for a one-time mount read of external storage.
  useEffect(() => {
    if (hasInitialGame) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadCurrentGame());
    setLoaded(true);
  }, [hasInitialGame]);

  const goStart = useCallback(() => setPly(START_PLY), []);
  const goEnd = useCallback(() => {
    if (game) setPly(game.moves.length - 1);
  }, [game]);
  const goPrev = useCallback(() => {
    if (game) setPly((p) => prevPly(game, p));
  }, [game]);
  const goNext = useCallback(() => {
    if (game) setPly((p) => nextPly(game, p));
  }, [game]);

  // Arrow-key navigation.
  useEffect(() => {
    if (!game) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowUp") goStart();
      else if (e.key === "ArrowDown") goEnd();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, goPrev, goNext, goStart, goEnd]);

  if (!loaded) {
    return <div className="p-6 text-sm text-zinc-500">Loading…</div>;
  }

  if (!game) {
    return (
      <EmptyState
        icon={<FileX2 className="size-8" />}
        title="No game loaded"
        description="Import a PGN to start reviewing a game."
        action={
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
          >
            Go to import
          </Link>
        }
      />
    );
  }

  const orientation: PieceColor = "w";
  const fen = fenAtPly(game, ply);
  const lastMove = lastMoveSquares(game, ply);
  const currentMove: ReviewedMove | null =
    ply >= 0 ? { ...game.moves[ply] } : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Board + controls */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-[34rem]">
          <ChessboardViewer
            fen={fen}
            orientation={orientation}
            lastMove={lastMove}
          />
        </div>
        <MoveControls
          onStart={goStart}
          onPrev={goPrev}
          onNext={goNext}
          onEnd={goEnd}
          atStart={isAtStart(ply)}
          atEnd={isAtEnd(game, ply)}
        />
      </div>

      {/* Side panels */}
      <div className="flex flex-col gap-4">
        <GameSummary game={game} />
        <Card>
          <CardHeader>
            <CardTitle>Moves</CardTitle>
          </CardHeader>
          <MoveList moves={game.moves} currentPly={ply} onSelect={setPly} />
        </Card>
        <MoveDetails move={currentMove} />
      </div>
    </div>
  );
}
