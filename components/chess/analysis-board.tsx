"use client";

import { useMemo } from "react";
import type { MoveClassification } from "@/types/review";
import type { PieceColor } from "@/types/chess";
import { CLASS_META } from "@/lib/review/classification-meta";
import { cn } from "@/lib/utils";

const LIGHT = "#d9d9d9";
const DARK = "#72a947";
const LAST_MOVE = "rgba(238, 202, 175, 0.82)";

type Squares = { from: string; to: string };
type PieceCode =
  | "p"
  | "n"
  | "b"
  | "r"
  | "q"
  | "k"
  | "P"
  | "N"
  | "B"
  | "R"
  | "Q"
  | "K";

const PIECES: Record<PieceCode, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
  P: "♙",
  N: "♘",
  B: "♗",
  R: "♖",
  Q: "♕",
  K: "♔",
};

function parseFenBoard(fen: string): (PieceCode | null)[][] {
  const board = fen.split(/\s+/)[0] ?? "";
  return board.split("/").map((rank) => {
    const row: (PieceCode | null)[] = [];
    for (const char of rank) {
      const empty = Number(char);
      if (Number.isInteger(empty) && empty > 0) {
        row.push(...Array<null>(empty).fill(null));
      } else {
        row.push(char as PieceCode);
      }
    }
    return row;
  });
}

function squareToPoint(square: string, orientation: PieceColor) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const col = orientation === "b" ? 7 - file : file;
  const row = orientation === "b" ? rank - 1 : 8 - rank;
  return {
    x: col * 12.5 + 6.25,
    y: row * 12.5 + 6.25,
  };
}

function squareName(row: number, col: number, orientation: PieceColor) {
  const file = orientation === "b" ? 7 - col : col;
  const rank = orientation === "b" ? row + 1 : 8 - row;
  return `${String.fromCharCode(97 + file)}${rank}`;
}

function orientedPiece(
  board: (PieceCode | null)[][],
  row: number,
  col: number,
  orientation: PieceColor,
) {
  const sourceRow = orientation === "b" ? 7 - row : row;
  const sourceCol = orientation === "b" ? 7 - col : col;
  return board[sourceRow]?.[sourceCol] ?? null;
}

function Arrow({
  move,
  orientation,
}: {
  move: Squares;
  orientation: PieceColor;
}) {
  const from = squareToPoint(move.from, orientation);
  const to = squareToPoint(move.to, orientation);

  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
      <defs>
        <marker
          id="tempo-best-arrow"
          markerHeight="8"
          markerWidth="8"
          orient="auto"
          refX="7"
          refY="4"
        >
          <path d="M0,0 L8,4 L0,8 z" fill="#111111" />
        </marker>
      </defs>
      <line
        x1={`${from.x}%`}
        y1={`${from.y}%`}
        x2={`${to.x}%`}
        y2={`${to.y}%`}
        stroke="#111111"
        strokeLinecap="round"
        strokeWidth="2.8%"
        markerEnd="url(#tempo-best-arrow)"
        opacity="0.72"
      />
    </svg>
  );
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
  const board = useMemo(() => parseFenBoard(fen), [fen]);
  const badge =
    classification && lastMove
      ? {
          pos: squareToPoint(lastMove.to, orientation),
          meta: CLASS_META[classification],
        }
      : null;

  return (
    <div className="@container relative aspect-square w-full select-none overflow-hidden bg-zinc-900 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {Array.from({ length: 64 }, (_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const square = squareName(row, col, orientation);
          const piece = orientedPiece(board, row, col, orientation);
          const isLight = (row + col) % 2 === 0;
          const highlighted =
            lastMove && (square === lastMove.from || square === lastMove.to);
          const showRank = col === 0;
          const showFile = row === 7;
          const labelColor = isLight ? "text-[#72a947]" : "text-zinc-100";

          return (
            <div
              key={square}
              className="relative flex items-center justify-center"
              style={{ backgroundColor: highlighted ? LAST_MOVE : isLight ? LIGHT : DARK }}
            >
              {showRank ? (
                <span
                  className={cn(
                    "absolute left-1 top-0.5 z-10 text-[clamp(11px,2.1cqw,22px)] font-bold leading-none",
                    labelColor,
                  )}
                >
                  {square[1]}
                </span>
              ) : null}
              {showFile ? (
                <span
                  className={cn(
                    "absolute bottom-0.5 right-1 z-10 text-[clamp(11px,2.1cqw,22px)] font-bold leading-none",
                    labelColor,
                  )}
                >
                  {square[0]}
                </span>
              ) : null}
              {piece ? (
                <span
                  className={cn(
                    "tempo-piece leading-none",
                    piece === piece.toUpperCase()
                      ? "tempo-piece-white"
                      : "tempo-piece-black",
                  )}
                >
                  {PIECES[piece]}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {bestMove ? <Arrow move={bestMove} orientation={orientation} /> : null}

      {badge ? (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${badge.pos.x}%`, top: `${badge.pos.y}%` }}
        >
          <span
            className={cn(
              "flex size-[clamp(22px,4.2cqw,40px)] items-center justify-center border-2 border-white/85 text-[clamp(10px,1.8cqw,16px)] font-black leading-none shadow-lg shadow-black/40",
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
