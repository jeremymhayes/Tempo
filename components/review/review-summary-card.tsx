import type { MoveClassification, ReviewSummary } from "@/types/review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CLASSIFICATION_LABEL: Record<MoveClassification, string> = {
  brilliant: "Brilliant",
  great: "Great",
  best: "Best",
  good: "Good",
  book: "Book",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

const ORDER: MoveClassification[] = [
  "brilliant",
  "great",
  "best",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
];

function formatAccuracy(value: number | undefined): string {
  return typeof value === "number" ? `${value}%` : "--";
}

function CountList({
  label,
  counts,
}: {
  label: string;
  counts: Partial<Record<MoveClassification, number>>;
}) {
  const populated = ORDER.filter((classification) => counts[classification]);

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase text-zinc-500">{label}</p>
      {populated.length === 0 ? (
        <p className="text-sm text-zinc-600">No moves</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {populated.map((classification) => (
            <span
              key={classification}
              className="rounded border border-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300"
            >
              {CLASSIFICATION_LABEL[classification]} {counts[classification]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewSummaryCard({
  summary,
}: {
  summary: ReviewSummary | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Starter Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary ? (
          <p className="text-sm text-zinc-500">Reviewing game...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-zinc-800 p-3">
                <p className="text-xs text-zinc-500">White accuracy</p>
                <p className="mt-1 font-mono text-lg text-zinc-100">
                  {formatAccuracy(summary.accuracy.white)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-800 p-3">
                <p className="text-xs text-zinc-500">Black accuracy</p>
                <p className="mt-1 font-mono text-lg text-zinc-100">
                  {formatAccuracy(summary.accuracy.black)}
                </p>
              </div>
            </div>
            <CountList
              label="White"
              counts={summary.classifications.white}
            />
            <CountList
              label="Black"
              counts={summary.classifications.black}
            />
            <p className="border-t border-zinc-800 pt-3 text-xs leading-relaxed text-zinc-600">
              This first pass uses PGN patterns, not Stockfish. Engine-backed
              scoring can replace these provisional labels later.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
