"use client";

import type { WhiteScore } from "@/lib/engine/eval-format";
import { CLASS_META } from "@/lib/review/classification-meta";
import type { ReviewListMove } from "@/lib/review/review-stats";

const CLASSIFICATION_SCORE = {
  brilliant: 100,
  great: 98,
  book: 100,
  best: 100,
  excellent: 96,
  good: 88,
  inaccuracy: 72,
  mistake: 55,
  miss: 45,
  blunder: 18,
} as const;

function xForIndex(index: number, count: number, width: number): number {
  if (count <= 0) return 0;
  if (count === 1) return width / 2;
  return (index / (count - 1)) * width;
}

export function EvalGraph({
  moves,
  evalByPly,
  currentPly,
}: {
  moves: ReviewListMove[];
  evalByPly: Record<number, WhiteScore>;
  currentPly: number;
}) {
  const width = 440;
  const height = 86;
  const points = moves.map((move, i) => {
    const score = evalByPly[move.ply];
    const cp =
      score?.type === "cp"
        ? score.value
        : score?.type === "mate"
          ? Math.sign(score.value) * 900
          : (CLASSIFICATION_SCORE[move.classification ?? "good"] - 75) * 22;
    const x = xForIndex(i, moves.length, width);
    const y = height / 2 - Math.max(-650, Math.min(650, cp)) / 18;
    return { x, y: Math.max(4, Math.min(height - 4, y)), move };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const area = points.length
    ? `${path} L ${width} ${height / 2} L 0 ${height / 2} Z`
    : "";
  const current = points.find((point) => point.move.ply === currentPly);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full bg-zinc-200"
      role="img"
      aria-label="Evaluation graph"
    >
      <rect width={width} height={height / 2} y={0} fill="#2e2e2e" />
      <rect width={width} height={height / 2} y={height / 2} fill="#d8d8d8" />
      <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="#9f9f9f" />
      {area ? <path d={area} fill="#f1f1f1" opacity="0.9" /> : null}
      {path ? <path d={path} fill="none" stroke="#fafafa" strokeWidth="2" /> : null}
      {current ? (
        <line
          x1={current.x}
          x2={current.x}
          y1="0"
          y2={height}
          stroke="#111111"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      ) : null}
      {points.map((point) => {
        const meta = point.move.classification
          ? CLASS_META[point.move.classification]
          : null;
        return (
          <circle
            key={point.move.ply}
            cx={point.x}
            cy={point.y}
            r={point.move.ply === currentPly ? "4.5" : "3"}
            fill={meta?.hex ?? "#79b84a"}
            stroke={point.move.ply === currentPly ? "#111111" : "#2a2a2a"}
            strokeWidth={point.move.ply === currentPly ? "2" : "1"}
          />
        );
      })}
    </svg>
  );
}
