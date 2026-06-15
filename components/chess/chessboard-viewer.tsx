"use client";

import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { PieceColor } from "@/types/chess";

const LAST_MOVE_HIGHLIGHT = "rgba(120, 120, 90, 0.45)";

export function ChessboardViewer({
  fen,
  orientation = "w",
  lastMove,
}: {
  fen: string;
  orientation?: PieceColor;
  lastMove?: { from: string; to: string } | null;
}) {
  const squareStyles = useMemo(() => {
    if (!lastMove) return {};
    return {
      [lastMove.from]: { background: LAST_MOVE_HIGHLIGHT },
      [lastMove.to]: { background: LAST_MOVE_HIGHLIGHT },
    };
  }, [lastMove]);

  return (
    <div className="w-full select-none">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation === "b" ? "black" : "white",
          allowDragging: false,
          showAnimations: true,
          animationDurationInMs: 150,
          squareStyles,
          darkSquareStyle: { backgroundColor: "#46464a" },
          lightSquareStyle: { backgroundColor: "#9a9a9c" },
          boardStyle: { borderRadius: "4px", overflow: "hidden" },
          id: "review-board",
        }}
      />
    </div>
  );
}
