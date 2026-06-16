"use client";

import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { MoveClassification } from "@/types/review";
import type { PieceColor } from "@/types/chess";
import { CLASS_META } from "@/lib/review/classification-meta";
import { cn } from "@/lib/utils";

const LIGHT = "#e8edd0";
const DARK = "#6f9b4f";
const LAST_MOVE = "rgba(245, 209, 66, 0.42)";
const BEST_ARROW = "rgba(56, 189, 120, 0.9)";

type Squares = { from: string; to: string };

function squareCorner(square: string, orientation: PieceColor) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const col = orientation === "b" ? 7 - file : file;
  const rowFromTop = orientation === "b" ? rank - 1 : 8 - rank;
  return { left: (col + 1) * 12.5, top: rowFromTop * 12.5 };
}

export function AnalysisBoard({
  fen,
  orientation = "w",
  lastMove,
  bestMove,
  classification,
}: {
  fen: string;
  orientation?: PieceColor;
  lastMove?: Squares | null;
  bestMove?: Squares | null;
  classification?: MoveClassification | null;
}) {
  const squareStyles = useMemo(() => {
    if (!lastMove) return {};
    return {
      [lastMove.from]: { background: LAST_MOVE },
      [lastMove.to]: { background: LAST_MOVE },
    };
  }, [lastMove]);

  const arrows = useMemo(
    () =>
      bestMove
        ? [{ startSquare: bestMove.from, endSquare: bestMove.to, color: BEST_ARROW }]
        : [],
    [bestMove],
  );

  const badge =
    classification && lastMove
      ? { pos: squareCorner(lastMove.to, orientation), meta: CLASS_META[classification] }
      : null;

  return (
    <div className="@container relative aspect-square w-full select-none overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-black/30">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation === "b" ? "black" : "white",
          allowDragging: false,
          showAnimations: true,
          animationDurationInMs: 160,
          squareStyles,
          arrows,
          darkSquareStyle: { backgroundColor: DARK },
          lightSquareStyle: { backgroundColor: LIGHT },
          boardStyle: { borderRadius: "0px" },
          id: "analysis-board",
        }}
      />

      {badge ? (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${badge.pos.left}%`, top: `${badge.pos.top}%` }}
        >
          <span
            className={cn(
              "flex size-[clamp(18px,3.4cqw,34px)] items-center justify-center rounded-full border-2 border-white/85 text-[clamp(9px,1.7cqw,15px)] font-black leading-none shadow-lg shadow-black/40",
              badge.meta.badge,
              badge.meta.text,
            )}
          >
            {badge.meta.symbol}
          </span>
        </div>
      ) : null}
    </div>
  );
}
