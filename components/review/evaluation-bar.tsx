"use client";

import { cn } from "@/lib/utils";
import {
  formatScore,
  whiteWinPercent,
  type WhiteScore,
} from "@/lib/engine/eval-format";

/**
 * Vertical advantage bar. White fills from the bottom; the share comes from a
 * logistic mapping of centipawns so it animates smoothly.
 */
export function EvaluationBar({
  score,
  orientation = "w",
  className,
}: {
  score: WhiteScore | null;
  orientation?: "w" | "b";
  className?: string;
}) {
  const whitePct = score ? whiteWinPercent(score) : 50;
  const bottomPct = orientation === "b" ? 100 - whitePct : whitePct;

  const label = score ? formatScore(score) : "–";
  const whiteAhead = score ? score.value >= 0 : true;
  const labelAtBottom = orientation === "b" ? !whiteAhead : whiteAhead;

  return (
    <div
      className={cn(
        "relative flex h-full w-7 shrink-0 flex-col overflow-hidden bg-zinc-900 ring-1 ring-black/50",
        className,
      )}
      aria-label={`Evaluation ${label}`}
      title={`Evaluation ${label}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 bg-zinc-100 transition-[height] duration-500 ease-out"
        style={{ height: `${bottomPct}%` }}
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 z-10 text-center text-[9px] font-bold tabular-nums",
          labelAtBottom ? "bottom-1 text-zinc-900" : "top-1 text-zinc-100",
        )}
      >
        {label}
      </span>
    </div>
  );
}
