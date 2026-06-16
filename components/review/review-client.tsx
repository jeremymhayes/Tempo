"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileX2 } from "lucide-react";
import type { ParsedGame, PieceColor } from "@/types/chess";
import type { MoveClassification, ReviewedMove } from "@/types/review";
import { createStarterReview } from "@/lib/review/starter-review";
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
import { useEngineAnalysis } from "@/lib/engine/use-engine";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AnalysisSettings,
} from "@/lib/engine/settings";
import {
  fenSideToMove,
  toWhitePov,
  type WhiteScore,
} from "@/lib/engine/eval-format";
import { uciToSquares } from "@/lib/engine/san";
import { centipawnLoss, classifyLoss } from "@/lib/engine/classify";
import { CLASS_META } from "@/lib/review/classification-meta";
import { AnalysisBoard } from "@/components/chess/analysis-board";
import { EvaluationBar } from "./evaluation-bar";
import { MoveControls } from "./move-controls";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const RESULT_LABEL: Record<string, string> = {
  "1-0": "White won",
  "0-1": "Black won",
  "1/2-1/2": "Draw",
  "*": "Game in progress",
};

/**
 * Tracks a box's size so the board can be a perfect square within it. Uses a
 * callback ref so the observer attaches even when the node mounts later (e.g.
 * after the game finishes loading).
 */
function useBoxSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, size] as const;
}

export function ReviewClient({
  initialGame,
}: {
  initialGame?: ParsedGame | null;
}) {
  const hasInitialGame = initialGame !== undefined;
  const [game, setGame] = useState<ParsedGame | null>(initialGame ?? null);
  const [loaded, setLoaded] = useState(hasInitialGame);
  const [ply, setPly] = useState(START_PLY);

  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const updateSettings = useCallback((patch: Partial<AnalysisSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const [evalByPly, setEvalByPly] = useState<Record<number, WhiteScore>>({});
  const [boardAreaRef, boardArea] = useBoxSize<HTMLDivElement>();

  const review = useMemo(() => (game ? createStarterReview(game) : null), [game]);
  const reviewedMoves = review?.moves ?? [];

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (hasInitialGame) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadCurrentGame());
    setLoaded(true);
  }, [hasInitialGame]);

  useEffect(() => {
    setEvalByPly({});
  }, [game]);

  const fen = game ? fenAtPly(game, ply) : "";
  const engine = useEngineAnalysis({ fen, enabled: Boolean(game), settings });
  const liveUpdate =
    engine.update && engine.update.fen === fen ? engine.update : null;

  useEffect(() => {
    if (!liveUpdate?.done || !liveUpdate.lines[0]) return;
    const ws = toWhitePov(liveUpdate.lines[0].score, fenSideToMove(fen));
    setEvalByPly((prev) =>
      prev[ply] && prev[ply].type === ws.type && prev[ply].value === ws.value
        ? prev
        : { ...prev, [ply]: ws },
    );
  }, [liveUpdate, fen, ply]);

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

  const liveWhiteScore: WhiteScore | null = liveUpdate?.lines[0]
    ? toWhitePov(liveUpdate.lines[0].score, fenSideToMove(fen))
    : (evalByPly[ply] ?? null);

  const bestArrow = useMemo(() => {
    if (!settings.showBestMove) return null;
    const uci = liveUpdate?.bestMove ?? liveUpdate?.lines[0]?.pv[0];
    if (!uci) return null;
    const sq = uciToSquares(uci);
    return sq ? { from: sq.from, to: sq.to } : null;
  }, [liveUpdate, settings.showBestMove]);

  const classifiedMoves = useMemo(() => {
    if (!game) return [];
    return game.moves.map((move, i) => {
      const base = reviewedMoves[i] ?? move;
      const before = evalByPly[i - 1];
      const after = evalByPly[i];
      if (before && after) {
        const loss = centipawnLoss(before, after, move.color);
        return { ...base, classification: classifyLoss(loss), centipawnLoss: loss };
      }
      return base;
    });
  }, [game, reviewedMoves, evalByPly]);

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
  const sideToMove = fenSideToMove(fen);
  const lastMove = lastMoveSquares(game, ply);
  const currentClass: MoveClassification | null =
    ply >= 0
      ? ((classifiedMoves[ply] as ReviewedMove | undefined)?.classification ?? null)
      : null;

  const side = Math.max(0, Math.min(boardArea.w - 34, boardArea.h));

  return (
    <div className="h-[calc(100dvh-3rem)] overflow-hidden rounded-2xl bg-gradient-to-br from-[#23263f] via-[#191b2c] to-[#111220] p-4 ring-1 ring-white/10">
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)_18rem]">
        {/* Left */}
        <div className="hidden min-h-0 lg:block">
          <LeftPanel
            game={game}
            sideToMove={sideToMove}
            status={engine.status}
            error={engine.error}
            whiteScore={liveWhiteScore}
            depth={liveUpdate?.depth ?? 0}
            settings={settings}
            onSettingsChange={updateSettings}
            onAnalyzeNow={engine.analyzeNow}
          />
        </div>

        {/* Center board */}
        <div className="flex min-h-0 flex-col gap-3">
          <div
            ref={boardAreaRef}
            className="flex min-h-0 flex-1 items-center justify-center"
          >
            {side > 0 ? (
              <div className="flex items-stretch gap-2.5" style={{ height: side }}>
                {settings.showEvalBar ? (
                  <EvaluationBar score={liveWhiteScore} orientation={orientation} />
                ) : null}
                <div style={{ width: side, height: side }}>
                  <AnalysisBoard
                    fen={fen}
                    orientation={orientation}
                    lastMove={lastMove}
                    bestMove={bestArrow}
                    classification={currentClass}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-center gap-3">
            <CurrentMoveChip classification={currentClass} />
            <MoveControls
              onStart={goStart}
              onPrev={goPrev}
              onNext={goNext}
              onEnd={goEnd}
              atStart={isAtStart(ply)}
              atEnd={isAtEnd(game, ply)}
            />
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {RESULT_LABEL[game.result] ?? game.result}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="min-h-0">
          <RightPanel
            fen={fen}
            update={liveUpdate}
            showBestMove={settings.showBestMove}
            moves={classifiedMoves.length ? classifiedMoves : game.moves}
            currentPly={ply}
            onSelect={setPly}
          />
        </div>
      </div>
    </div>
  );
}

function CurrentMoveChip({
  classification,
}: {
  classification: MoveClassification | null;
}) {
  if (!classification) return <span className="w-px" />;
  const meta = CLASS_META[classification];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.badge,
        meta.text,
      )}
    >
      <span className="text-[11px] font-black">{meta.symbol}</span>
      {meta.label}
    </span>
  );
}
