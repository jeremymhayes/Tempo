"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { ParsedGame, PieceColor } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import {
  deriveOpeningBreakdown,
  type OpeningBreakdown,
} from "@/lib/chess/openings";
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
import { CLASS_META } from "@/lib/review/classification-meta";
import {
  buildReviewStats,
  type ReviewListMove,
} from "@/lib/review/review-stats";
import type { ReviewSnapshot } from "@/lib/review/snapshot";
import { buildEngineReviewedMoves } from "@/lib/review/deep-analysis";
import { useDeepReviewAnalysis } from "@/lib/review/use-deep-review-analysis";
import { AnalysisBoard } from "@/components/chess/analysis-board";
import { EvaluationBar } from "./evaluation-bar";
import { EngineSettingsPopover } from "./engine-settings-popover";
import { ReviewMovePanel } from "./review-move-panel";
import { ReviewSummaryPanel } from "./review-summary-panel";
import { ShareReportButton } from "./share-report-button";
import { cn } from "@/lib/utils";

const RESULT_LABEL: Record<string, string> = {
  "1-0": "White won",
  "0-1": "Black won",
  "1/2-1/2": "Draw",
  "*": "Game in progress",
};

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

function formatPlayer(name: string | undefined, fallback: string) {
  const value = name?.trim();
  return value && value !== "?" ? value : fallback;
}

function shortName(value: string) {
  const clean = value.trim();
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 13)}…`;
}

export function ReviewClient({
  initialGame,
  initialReviewSnapshot,
  initialOpening,
  gameId,
  initialShareToken = null,
  initialShareEnabled = false,
}: {
  initialGame?: ParsedGame | null;
  initialReviewSnapshot?: ReviewSnapshot | null;
  initialOpening?: OpeningBreakdown | null;
  gameId?: string;
  initialShareToken?: string | null;
  initialShareEnabled?: boolean;
}) {
  const hasInitialGame = initialGame !== undefined;
  const [game, setGame] = useState<ParsedGame | null>(initialGame ?? null);
  const [loaded, setLoaded] = useState(hasInitialGame);
  const [ply, setPly] = useState(START_PLY);
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [liveEvalByPly, setLiveEvalByPly] = useState<
    Record<number, WhiteScore>
  >({});
  const [boardAreaRef, boardArea] = useBoxSize<HTMLDivElement>();

  const updateSettings = useCallback((patch: Partial<AnalysisSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const review = useMemo(() => {
    if (!game) return null;
    if (!initialReviewSnapshot) return createStarterReview(game);

    const snapshotByPly = new Map(
      initialReviewSnapshot.moves.map((move) => [move.ply, move]),
    );
    return {
      moves: game.moves.map((move) => {
        const snapshot = snapshotByPly.get(move.ply);
        return snapshot
          ? {
              ...move,
              classification: snapshot.classification,
              centipawnLoss: snapshot.centipawnLoss,
            }
          : move;
      }),
      summary: null,
    };
  }, [game, initialReviewSnapshot]);
  const reviewedMoves = review?.moves ?? [];
  const deepReview = useDeepReviewAnalysis(game);
  const displayEvalByPly = useMemo(
    () => ({ ...deepReview.evalByPly, ...liveEvalByPly }),
    [deepReview.evalByPly, liveEvalByPly],
  );
  const opening = useMemo(
    () => (game ? (initialOpening ?? deriveOpeningBreakdown(game.moves)) : null),
    [game, initialOpening],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (hasInitialGame) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadCurrentGame());
    setLoaded(true);
  }, [hasInitialGame]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveEvalByPly({});
  }, [game]);

  const fen = game ? fenAtPly(game, ply) : "";
  const engine = useEngineAnalysis({
    fen,
    enabled: Boolean(game) && deepReview.status === "ready",
    settings,
  });
  const liveUpdate =
    engine.update && engine.update.fen === fen ? engine.update : null;

  useEffect(() => {
    if (!liveUpdate?.done || !liveUpdate.lines[0]) return;
    const ws = toWhitePov(liveUpdate.lines[0].score, fenSideToMove(fen));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveEvalByPly((prev) =>
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

  if (!loaded) {
    return (
      <ReviewShell>
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      </ReviewShell>
    );
  }

  if (!game) {
    return (
      <ReviewShell>
        <div className="flex h-full items-center justify-center">
          <div className="border border-zinc-800 bg-zinc-950 p-8 text-center">
            <p className="text-lg font-bold text-zinc-100">No game loaded</p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Import a PGN to start a guest review or sign in to open a saved game.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-10 items-center bg-zinc-100 px-5 text-sm font-bold text-zinc-950 hover:bg-white"
            >
              Go to import
            </Link>
          </div>
        </div>
      </ReviewShell>
    );
  }

  if (deepReview.status !== "ready") {
    return (
      <ReviewShell>
        <div className="flex h-full items-center justify-center bg-[#111111] px-6 text-zinc-100">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              Stockfish Review
            </p>
            <h1 className="mt-2 text-lg font-bold text-zinc-100">
              {deepReview.status === "error"
                ? "Analysis failed"
                : "Analyzing the full game"}
            </h1>
            {deepReview.status === "error" ? (
              <p className="mt-3 text-sm leading-relaxed text-red-300">
                {deepReview.error ?? "Stockfish could not finish this review."}
              </p>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Tempo is evaluating every position at depth 16 and Stockfish
                  skill 20 before showing classifications.
                </p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-zinc-100 transition-[width]"
                    style={{
                      width:
                        deepReview.total > 0
                          ? `${Math.round((deepReview.current / deepReview.total) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-zinc-500">
                  {deepReview.current} / {deepReview.total} positions
                </p>
              </>
            )}
          </div>
        </div>
      </ReviewShell>
    );
  }

  const orientation: PieceColor = "w";
  const sideToMove = fenSideToMove(fen);
  const lastMove = lastMoveSquares(game, ply);
  const liveWhiteScore: WhiteScore | null = liveUpdate?.lines[0]
    ? toWhitePov(liveUpdate.lines[0].score, sideToMove)
    : (displayEvalByPly[ply] ?? null);

  const bestArrow = (() => {
    if (!settings.showBestMove) return null;
    const uci = liveUpdate?.bestMove ?? liveUpdate?.lines[0]?.pv[0];
    if (!uci) return null;
    const sq = uciToSquares(uci);
    return sq ? { from: sq.from, to: sq.to } : null;
  })();

  const classifiedMoves: ReviewListMove[] = buildEngineReviewedMoves(
    deepReview.moves.length > 0 ? deepReview.moves : reviewedMoves,
    deepReview.evalByPly,
  );

  const currentMove = ply >= 0 ? (classifiedMoves[ply] as ReviewedMove) : null;
  const currentClass = currentMove?.classification ?? null;
  const boardSide = Math.max(0, Math.min(boardArea.w - 46, boardArea.h - 94));
  const whiteName = formatPlayer(game.white, "White");
  const blackName = formatPlayer(game.black, "Black");
  const stats = buildReviewStats(classifiedMoves);
  const openingBreakdown = opening ?? deriveOpeningBreakdown(game.moves);
  const panelMode = ply <= START_PLY ? "summary" : "moves";

  return (
    <ReviewShell>
      <div className="grid h-full min-h-0 grid-cols-1 overflow-y-auto bg-[#111111] text-zinc-100 xl:grid-cols-[minmax(620px,1fr)_500px] xl:overflow-hidden">
        <section className="relative flex min-h-[680px] flex-col border-r border-zinc-800 bg-[#151515] xl:min-h-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-5">
            <div>
              <p className="text-[11px] font-bold uppercase text-zinc-500">
                Tempo Analysis
              </p>
              <p className="text-sm font-bold text-zinc-100">
                {shortName(whiteName)} vs {shortName(blackName)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {gameId ? (
                <ShareReportButton
                  gameId={gameId}
                  initialShareToken={initialShareToken}
                  initialShareEnabled={initialShareEnabled}
                />
              ) : null}
              <EngineSettingsPopover
                settings={settings}
                status={engine.status}
                depth={liveUpdate?.depth ?? 0}
                onChange={updateSettings}
                onAnalyzeNow={engine.analyzeNow}
              />
            </div>
          </div>

          <div
            ref={boardAreaRef}
            className="flex min-h-0 flex-1 items-center justify-center px-4 py-3"
          >
            {boardSide > 0 ? (
              <div style={{ width: settings.showEvalBar ? boardSide + 38 : boardSide }}>
                <PlayerStrip
                  name={blackName}
                  side="black"
                  style={{
                    marginLeft: settings.showEvalBar ? 38 : 0,
                    width: boardSide,
                  }}
                />
                <div className="flex items-stretch gap-2.5">
                  {settings.showEvalBar ? (
                    <EvaluationBar
                      score={liveWhiteScore}
                      orientation={orientation}
                      className="h-auto"
                    />
                  ) : null}
                  <div style={{ width: boardSide, height: boardSide }}>
                    <AnalysisBoard
                      fen={fen}
                      orientation={orientation}
                      lastMove={lastMove}
                      bestMove={bestArrow}
                      classification={currentClass}
                    />
                  </div>
                </div>
                <PlayerStrip
                  name={whiteName}
                  side="white"
                  style={{
                    marginLeft: settings.showEvalBar ? 38 : 0,
                    width: boardSide,
                  }}
                />
              </div>
            ) : null}
          </div>

          <BoardFooter
            result={RESULT_LABEL[game.result] ?? game.result}
            currentMove={currentMove}
            atStart={isAtStart(ply)}
            atEnd={isAtEnd(game, ply)}
            onStart={goStart}
            onPrev={goPrev}
            onNext={goNext}
            onEnd={goEnd}
          />
        </section>

        <aside className="flex min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
          {panelMode === "summary" ? (
            <ReviewSummaryPanel
              whiteName={whiteName}
              blackName={blackName}
              stats={stats}
              moves={classifiedMoves}
              evalByPly={deepReview.evalByPly}
              opening={openingBreakdown}
            />
          ) : (
            <ReviewMovePanel
              moves={classifiedMoves}
              currentPly={ply}
              evalByPly={deepReview.evalByPly}
              onSelect={setPly}
            />
          )}
        </aside>
      </div>
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full min-h-0 overflow-hidden bg-black text-zinc-100">
      {children}
    </div>
  );
}

function PlayerStrip({
  name,
  side,
  style,
}: {
  name: string;
  side: "white" | "black";
  style?: CSSProperties;
}) {
  return (
    <div
      className="flex h-9 items-center gap-2 text-sm font-bold text-zinc-200"
      style={style}
    >
      <div
        className={cn(
          "flex size-8 items-center justify-center border border-zinc-700 text-xs font-black",
          side === "white" ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-zinc-200",
        )}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
      <span className="truncate">{name}</span>
    </div>
  );
}

function BoardFooter({
  result,
  currentMove,
  atStart,
  atEnd,
  onStart,
  onPrev,
  onNext,
  onEnd,
}: {
  result: string;
  currentMove: ReviewedMove | null;
  atStart: boolean;
  atEnd: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  const meta = currentMove?.classification
    ? CLASS_META[currentMove.classification]
    : null;

  return (
    <footer className="flex h-14 shrink-0 items-center justify-between border-t border-zinc-800 bg-[#101010] px-5">
      <div className="min-w-0">
        <p className="text-xs font-bold text-zinc-400">{result}</p>
        <p className="truncate font-mono text-sm text-zinc-100">
          {currentMove
            ? `${currentMove.moveNumber}${currentMove.color === "w" ? "." : "..."} ${currentMove.san}`
            : "Starting position"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {meta ? (
          <span className={cn("text-sm font-black", meta.text)}>
            <span
              className={cn(
                "mr-2 inline-flex size-6 items-center justify-center text-[11px]",
                meta.badge,
                meta.text,
              )}
            >
              {meta.symbol}
            </span>
            {meta.label}
          </span>
        ) : null}
        <div className="flex items-center">
          <NavButton onClick={onStart} disabled={atStart} label="Start">
            <ChevronsLeft className="size-4" />
          </NavButton>
          <NavButton onClick={onPrev} disabled={atStart} label="Previous">
            <ChevronLeft className="size-4" />
          </NavButton>
          <NavButton onClick={onNext} disabled={atEnd} label="Next">
            <ChevronRight className="size-4" />
          </NavButton>
          <NavButton onClick={onEnd} disabled={atEnd} label="End">
            <ChevronsRight className="size-4" />
          </NavButton>
        </div>
      </div>
    </footer>
  );
}

function NavButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center border-y border-r border-zinc-700 bg-[#202020] text-zinc-300 first:border-l hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:text-zinc-700"
    >
      {children}
    </button>
  );
}
