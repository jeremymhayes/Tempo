"use client";

import { Separator } from "@/components/ui/separator";
import type { OpeningBreakdown } from "@/lib/chess/openings";
import type { WhiteScore } from "@/lib/engine/eval-format";
import { CLASS_META, CLASS_ORDER } from "@/lib/review/classification-meta";
import type { ReviewListMove, ReviewStats } from "@/lib/review/review-stats";

import { EvalGraph } from "./eval-graph";
import { OpeningBreakdownPanel } from "./opening-breakdown";

function formatNumber(value?: number, digits = 1) {
  return typeof value === "number" ? value.toFixed(digits) : "--";
}

function formatRating(value?: number) {
  return typeof value === "number" ? String(value) : "--";
}

export function ReviewSummaryPanel({
  whiteName,
  blackName,
  stats,
  moves,
  evalByPly,
  opening,
}: {
  whiteName: string;
  blackName: string;
  stats: ReviewStats;
  moves: ReviewListMove[];
  evalByPly: Record<number, WhiteScore>;
  opening: OpeningBreakdown;
}) {
  const rows = CLASS_ORDER.filter((key) =>
    ["brilliant", "great", "best", "mistake", "blunder"].includes(key),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h1 className="text-base font-semibold text-zinc-100">
          Review Summary
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Accuracy, estimated rating, and move quality by side.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-500">
              {whiteName}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-100">
              {formatNumber(stats.accuracy.white)}
            </p>
            <p className="text-xs text-zinc-500">
              Elo {formatRating(stats.rating.white)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-500">
              {blackName}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-100">
              {formatNumber(stats.accuracy.black)}
            </p>
            <p className="text-xs text-zinc-500">
              Elo {formatRating(stats.rating.black)}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <OpeningBreakdownPanel opening={opening} />

        <Separator className="my-4" />

        <EvalGraph moves={moves} evalByPly={evalByPly} currentPly={-1} />

        <Separator className="my-4" />

        <div className="grid grid-cols-[1fr_64px_64px] gap-y-3 text-sm">
          <span className="text-zinc-500">Move quality</span>
          <span className="text-center text-zinc-500">White</span>
          <span className="text-center text-zinc-500">Black</span>
          {rows.map((key) => {
            const meta = CLASS_META[key];
            return (
              <div key={key} className="contents">
                <span className="font-medium text-zinc-200">{meta.label}</span>
                <span
                  className="text-center font-semibold tabular-nums"
                  style={{ color: meta.hex }}
                >
                  {stats.counts.white[key] ?? 0}
                </span>
                <span
                  className="text-center font-semibold tabular-nums"
                  style={{ color: meta.hex }}
                >
                  {stats.counts.black[key] ?? 0}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
