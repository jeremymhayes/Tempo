"use client";

import { useEffect, useRef } from "react";

import { Separator } from "@/components/ui/separator";
import type { WhiteScore } from "@/lib/engine/eval-format";
import { CLASS_META } from "@/lib/review/classification-meta";
import {
  shouldShowMoveIcon,
  toMovePairs,
  type ReviewListMove,
} from "@/lib/review/review-stats";
import {
  REVIEW_MOVE_ROW_HEIGHT_PX,
  REVIEW_MOVE_VISIBLE_ROWS,
} from "@/lib/review/deep-analysis";
import { cn } from "@/lib/utils";

import { EvalGraph } from "./eval-graph";

function MoveCell({
  move,
  active,
  onSelect,
}: {
  move?: ReviewListMove;
  active: boolean;
  onSelect: (ply: number) => void;
}) {
  if (!move) return <span className="border-b border-zinc-800" />;

  const meta = move.classification ? CLASS_META[move.classification] : null;
  const showIcon = shouldShowMoveIcon(move.classification);
  const side = move.color === "w" ? "White" : "Black";
  const classification = meta ? `, ${meta.label}` : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(move.ply)}
      aria-label={`${side} move ${move.moveNumber}, ${move.san}${classification}`}
      aria-current={active ? "step" : undefined}
      data-active={active}
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_24px] items-center border-b border-zinc-800 px-2 py-1.5 text-left font-mono text-sm hover:bg-zinc-900",
        active
          ? "bg-zinc-100 font-semibold text-zinc-950 hover:bg-zinc-100"
          : "text-zinc-300",
      )}
    >
      <span className="truncate">{move.san}</span>
      {showIcon && meta ? (
        <span
          aria-hidden="true"
          className="text-right text-[11px] font-black"
          style={{ color: active ? "#111111" : meta.hex }}
        >
          {meta.symbol}
        </span>
      ) : (
        <span />
      )}
    </button>
  );
}

export function ReviewMovePanel({
  moves,
  currentPly,
  evalByPly,
  onSelect,
}: {
  moves: ReviewListMove[];
  currentPly: number;
  evalByPly: Record<number, WhiteScore>;
  onSelect: (ply: number) => void;
}) {
  const pairs = toMovePairs(moves);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = listRef.current;
    const el = container?.querySelector<HTMLElement>("[data-active='true']");
    if (!container || !el) return;

    el.scrollIntoView({ block: "nearest" });
  }, [currentPly]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h1 className="text-base font-semibold text-zinc-100">Move List</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Selected move is highlighted. Icons appear only for key move quality
          changes.
        </p>
      </div>

      <div className="px-5 py-4">
        <EvalGraph moves={moves} evalByPly={evalByPly} currentPly={currentPly} />
      </div>

      <Separator />

      <div className="px-5 py-4">
        <div
          ref={listRef}
          className="overflow-y-auto border border-zinc-800 bg-zinc-950"
          style={{
            maxHeight: `${REVIEW_MOVE_VISIBLE_ROWS * REVIEW_MOVE_ROW_HEIGHT_PX}px`,
          }}
        >
          <div className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)]">
            {pairs.map((pair) => (
              <div key={pair.moveNumber} className="contents">
                <span className="border-b border-zinc-800 px-2 py-1.5 text-right font-mono text-xs text-zinc-600">
                  {pair.moveNumber}.
                </span>
                <MoveCell
                  move={pair.white}
                  active={pair.white?.ply === currentPly}
                  onSelect={onSelect}
                />
                <MoveCell
                  move={pair.black}
                  active={pair.black?.ply === currentPly}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
