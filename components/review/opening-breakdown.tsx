import type { OpeningBreakdown } from "@/lib/chess/openings";
import { cn } from "@/lib/utils";

function bookStatus(opening: OpeningBreakdown): string {
  if (!opening.bookExitMove) {
    return opening.bookLastPly === null
      ? "No recognized book line"
      : "Stayed in book through the saved moves";
  }

  return `Left book on ${opening.bookExitMove}`;
}

export function OpeningBreakdownPanel({
  opening,
  className,
}: {
  opening: OpeningBreakdown;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 border border-zinc-800 bg-zinc-950 p-3 sm:grid-cols-[1fr_1fr]",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Opening
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-zinc-100">
          {opening.name}
        </p>
        {opening.eco ? (
          <p className="font-mono text-xs text-zinc-500">{opening.eco}</p>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Book Exit
        </p>
        <p className="mt-1 truncate text-sm text-zinc-300">
          {bookStatus(opening)}
        </p>
        <p className="font-mono text-xs text-zinc-600">
          {opening.matchedPlyCount} book plies
        </p>
      </div>
    </div>
  );
}
