"use client";

import { useEffect, useRef } from "react";
import type { GameMove } from "@/types/chess";
import type { MoveClassification } from "@/types/review";
import { cn } from "@/lib/utils";

type ReviewListMove = GameMove & { classification?: MoveClassification };

interface MovePair {
  moveNumber: number;
  white?: ReviewListMove;
  black?: ReviewListMove;
}

const CLASSIFICATION_SHORT: Record<MoveClassification, string> = {
  brilliant: "!!",
  great: "!",
  best: "Best",
  good: "Good",
  book: "Book",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

function toPairs(moves: ReviewListMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (const move of moves) {
    const last = pairs[pairs.length - 1];
    if (move.color === "w" || !last || last.black) {
      pairs.push({ moveNumber: move.moveNumber, white: undefined, black: undefined });
    }
    const target = pairs[pairs.length - 1];
    if (move.color === "w") target.white = move;
    else target.black = move;
  }
  return pairs;
}

function MoveCell({
  move,
  active,
  onSelect,
}: {
  move?: ReviewListMove;
  active: boolean;
  onSelect: (ply: number) => void;
}) {
  if (!move) return <span className="px-2" />;
  return (
    <button
      onClick={() => onSelect(move.ply)}
      className={cn(
        "rounded px-1.5 py-0.5 text-left font-mono text-sm transition-colors",
        active
          ? "bg-zinc-200 font-semibold text-zinc-900"
          : "text-zinc-300 hover:bg-zinc-800",
      )}
    >
      <span>{move.san}</span>
      {move.classification ? (
        <span className="ml-1 text-[10px] uppercase text-zinc-500">
          {CLASSIFICATION_SHORT[move.classification]}
        </span>
      ) : null}
    </button>
  );
}

export function MoveList({
  moves,
  currentPly,
  onSelect,
}: {
  moves: ReviewListMove[];
  currentPly: number;
  onSelect: (ply: number) => void;
}) {
  const pairs = toPairs(moves);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the active move scrolled into view as the user steps through.
  useEffect(() => {
    const el = containerRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  if (moves.length === 0) {
    return <p className="p-4 text-sm text-zinc-500">No moves.</p>;
  }

  return (
    <div ref={containerRef} className="max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 p-2">
        {pairs.map((pair) => (
          <div key={pair.moveNumber} className="contents">
            <span className="self-center px-2 font-mono text-xs text-zinc-600">
              {pair.moveNumber}.
            </span>
            <span data-active={pair.white?.ply === currentPly}>
              <MoveCell
                move={pair.white}
                active={pair.white?.ply === currentPly}
                onSelect={onSelect}
              />
            </span>
            <span data-active={pair.black?.ply === currentPly}>
              <MoveCell
                move={pair.black}
                active={pair.black?.ply === currentPly}
                onSelect={onSelect}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
