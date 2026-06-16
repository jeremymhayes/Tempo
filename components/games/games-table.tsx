import Link from "next/link";
import type { SavedGameSummary } from "@/lib/api/games";

export function GamesTable({ games }: { games: SavedGameSummary[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-2.5 font-medium">White</th>
            <th className="px-4 py-2.5 font-medium">Black</th>
            <th className="px-4 py-2.5 font-medium">Result</th>
            <th className="px-4 py-2.5 font-medium">Opening</th>
            <th className="px-4 py-2.5 font-medium">Accuracy</th>
            <th className="px-4 py-2.5 font-medium">Blunders</th>
            <th className="px-4 py-2.5 font-medium">Moves</th>
            <th className="px-4 py-2.5 font-medium">Date played</th>
            <th className="px-4 py-2.5 font-medium">Saved</th>
            <th className="px-4 py-2.5 font-medium" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr
              key={g.id}
              className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50"
            >
              <td className="px-4 py-2.5 text-zinc-200">{g.white}</td>
              <td className="px-4 py-2.5 text-zinc-200">{g.black}</td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">{g.result}</td>
              <td className="px-4 py-2.5 text-zinc-400">
                <span className="block max-w-44 truncate">
                  {g.openingName ?? "Unclassified Opening"}
                </span>
                {g.openingEco ? (
                  <span className="font-mono text-xs text-zinc-600">
                    {g.openingEco}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {typeof g.averageAccuracy === "number"
                  ? `${g.averageAccuracy.toFixed(1)}%`
                  : "—"}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {typeof g.blunders === "number" ? g.blunders : "—"}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {g.moveCount}
              </td>
              <td className="px-4 py-2.5 text-zinc-400">
                {g.datePlayed ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-zinc-400">{g.savedAt}</td>
              <td className="px-4 py-2.5 text-right">
                <Link
                  href={`/games/${g.id}`}
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
