"use client";

import { useEffect, useRef } from "react";
import { Lightbulb } from "lucide-react";
import type { GameMove } from "@/types/chess";
import type { MoveClassification } from "@/types/review";
import type { AnalysisUpdate } from "@/lib/engine/types";
import { toWhitePov, formatScore, fenSideToMove } from "@/lib/engine/eval-format";
import { uciLineToSan, uciToSan } from "@/lib/engine/san";
import { CLASS_META } from "@/lib/review/classification-meta";
import { cn } from "@/lib/utils";

type ListMove = GameMove & { classification?: MoveClassification };

interface Pair {
  moveNumber: number;
  white?: ListMove;
  black?: ListMove;
}

function toPairs(moves: ListMove[]): Pair[] {
  const pairs: Pair[] = [];
  for (const move of moves) {
    const last = pairs[pairs.length - 1];
    if (move.color === "w" || !last || last.black) {
      pairs.push({ moveNumber: move.moveNumber });
    }
    const target = pairs[pairs.length - 1];
    if (move.color === "w") target.white = move;
    else target.black = move;
  }
  return pairs;
}

function Cell({
  move,
  active,
  onSelect,
}: {
  move?: ListMove;
  active: boolean;
  onSelect: (ply: number) => void;
}) {
  if (!move) return <span />;
  const meta = move.classification ? CLASS_META[move.classification] : null;
  return (
    <button
      onClick={() => onSelect(move.ply)}
      data-active={active}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-left font-mono text-[13px] transition-colors",
        active
          ? "bg-emerald-400/15 font-semibold text-emerald-100 ring-1 ring-emerald-400/40"
          : "text-zinc-300 hover:bg-white/5",
      )}
    >
      <span className="truncate">{move.san}</span>
      {meta ? (
        <span
          className={cn(
            "ml-auto flex size-4 items-center justify-center rounded-full text-[9px] font-black leading-none",
            meta.badge,
            meta.text,
          )}
        >
          {meta.symbol}
        </span>
      ) : null}
    </button>
  );
}

export function RightPanel({
  fen,
  update,
  showBestMove,
  moves,
  currentPly,
  onSelect,
}: {
  fen: string;
  update: AnalysisUpdate | null;
  showBestMove: boolean;
  moves: ListMove[];
  currentPly: number;
  onSelect: (ply: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const sideToMove = fenSideToMove(fen);
  const topLine = update?.lines[0] ?? null;
  const bestUci = update?.bestMove ?? topLine?.pv[0] ?? null;
  const bestSan = bestUci ? uciToSan(fen, bestUci) : null;

  const pairs = toPairs(moves);

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Best line */}
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Best line
        </p>
        {showBestMove && bestSan ? (
          <div className="mb-2.5 flex items-center gap-2">
            <Lightbulb className="size-4 text-emerald-400" />
            <span className="font-mono text-lg font-bold text-emerald-300">
              {bestSan}
            </span>
            {topLine ? (
              <span className="ml-auto font-mono text-sm tabular-nums text-zinc-400">
                {formatScore(toWhitePov(topLine.score, sideToMove))}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mb-2.5 text-xs text-zinc-500">
            {update ? "—" : "Waiting for engine…"}
          </p>
        )}

        <div className="space-y-1.5">
          {update?.lines.length ? (
            update.lines.map((line) => (
              <div
                key={line.multipv}
                className="flex gap-2 rounded-md bg-black/20 px-2 py-1 text-[11px]"
              >
                <span className="shrink-0 font-mono font-semibold tabular-nums text-zinc-300">
                  {formatScore(toWhitePov(line.score, sideToMove))}
                </span>
                <span className="truncate font-mono text-zinc-500">
                  {uciLineToSan(fen, line.pv, 7).join(" ")}
                </span>
              </div>
            ))
          ) : (
            <div className="h-6" />
          )}
        </div>
      </div>

      {/* Move list */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04]">
        <p className="border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Moves
        </p>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {pairs.length === 0 ? (
            <p className="p-2 text-sm text-zinc-500">No moves.</p>
          ) : (
            <div className="grid grid-cols-[1.75rem_1fr_1fr] items-center gap-y-0.5">
              {pairs.map((pair) => (
                <div key={pair.moveNumber} className="contents">
                  <span className="px-1 text-right font-mono text-[11px] text-zinc-600">
                    {pair.moveNumber}.
                  </span>
                  <Cell
                    move={pair.white}
                    active={pair.white?.ply === currentPly}
                    onSelect={onSelect}
                  />
                  <Cell
                    move={pair.black}
                    active={pair.black?.ply === currentPly}
                    onSelect={onSelect}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
