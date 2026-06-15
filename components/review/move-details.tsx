import type { ReactNode } from "react";
import type { ReviewedMove, EngineEvaluation, MoveClassification } from "@/types/review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "—";

const CLASSIFICATION_STYLE: Record<MoveClassification, string> = {
  brilliant: "text-cyan-400",
  great: "text-sky-400",
  best: "text-emerald-400",
  good: "text-zinc-300",
  book: "text-zinc-400",
  inaccuracy: "text-yellow-500",
  mistake: "text-orange-500",
  blunder: "text-red-500",
};

function formatEval(ev?: EngineEvaluation): string {
  if (!ev) return PLACEHOLDER;
  if (ev.type === "mate") return `#${ev.value}`;
  const pawns = (ev.value / 100).toFixed(2);
  return ev.value > 0 ? `+${pawns}` : pawns;
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={cn("font-mono text-sm text-zinc-200", className)}>
        {value}
      </span>
    </div>
  );
}

export function MoveDetails({ move }: { move: ReviewedMove | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Move Detail</CardTitle>
        {move ? (
          <span className="font-mono text-xs text-zinc-400">
            {move.moveNumber}
            {move.color === "w" ? "." : "..."} {move.san}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="py-2">
        {!move ? (
          <p className="py-2 text-sm text-zinc-500">
            Select a move to see its details.
          </p>
        ) : (
          <>
            <Field
              label="Classification"
              value={move.classification ?? PLACEHOLDER}
              className={
                move.classification
                  ? CLASSIFICATION_STYLE[move.classification]
                  : undefined
              }
            />
            <Field label="Best move" value={move.bestMove ?? PLACEHOLDER} />
            <Field label="Eval before" value={formatEval(move.evalBefore)} />
            <Field label="Eval after" value={formatEval(move.evalAfter)} />
            <Field
              label="Centipawn loss"
              value={move.centipawnLoss ?? PLACEHOLDER}
            />
            <p className="mt-2 border-t border-zinc-800 pt-2 text-[11px] leading-relaxed text-zinc-600">
              Engine analysis is not connected yet. These fields will populate
              once Stockfish review is wired to the backend.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
