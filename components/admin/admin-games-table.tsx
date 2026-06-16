import { Trash2 } from "lucide-react";
import Link from "next/link";
import type { AdminUserGame } from "@/lib/admin/queries";
import { deleteGameAction } from "@/lib/admin/actions";
import { ConfirmButton } from "./confirm-button";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminGamesTable({
  userId,
  games,
}: {
  userId: string;
  games: AdminUserGame[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-2.5 font-medium">White</th>
            <th className="px-4 py-2.5 font-medium">Black</th>
            <th className="px-4 py-2.5 font-medium">Result</th>
            <th className="px-4 py-2.5 font-medium">Moves</th>
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
              <td className="px-4 py-2.5 text-zinc-200">
                {g.whiteName ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-zinc-200">
                {g.blackName ?? "—"}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {g.result ?? "—"}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {g.moveCount}
              </td>
              <td className="px-4 py-2.5 text-zinc-400">
                {fmtDate(g.createdAt)}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/games/${g.id}`}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    Open
                  </Link>
                  <ConfirmButton
                    action={deleteGameAction}
                    fields={{ gameId: g.id, userId }}
                    confirmMessage="Delete this game permanently?"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
