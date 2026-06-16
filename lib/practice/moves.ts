import type { Move } from "chess.js";

export const PRACTICE_MOVE_VISIBLE_ROWS = 10;

export type PracticeMoveItem = {
  key: string;
  label: string;
  san: string;
  moveNumber: number;
  color: Move["color"];
  active: boolean;
};

export function formatPracticeMoveLabel(move: Move, index: number) {
  const moveNumber = Math.floor(index / 2) + 1;
  return `${moveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

export function toPracticeMoveItems(moves: Move[]): PracticeMoveItem[] {
  const activeIndex = moves.length - 1;

  return moves.map((move, index) => ({
    key: `${index}-${move.from}-${move.to}-${move.san}`,
    label: formatPracticeMoveLabel(move, index),
    san: move.san,
    moveNumber: Math.floor(index / 2) + 1,
    color: move.color,
    active: index === activeIndex,
  }));
}
