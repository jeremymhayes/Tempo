"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { listSavedGames, type SavedGameSummary } from "@/lib/api/games";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentGames() {
  const [games, setGames] = useState<SavedGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      setGames((await listSavedGames()).slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load recent games.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialGames() {
      try {
        const nextGames = (await listSavedGames()).slice(0, 5);
        if (active) {
          setGames(nextGames);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load recent games.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialGames();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Games</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh recent games"
        >
          <RefreshCw className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="px-4 py-3 text-sm text-zinc-500">Loading...</p>
        ) : error ? (
          <div className="flex items-start gap-2 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : games.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">No games saved yet.</p>
        ) : (
          <div className="divide-y divide-zinc-900">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="block px-4 py-3 transition-colors hover:bg-zinc-900/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-zinc-200">
                    {game.white} vs {game.black}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {game.result}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-600">
                  <span>{game.moveCount} moves</span>
                  <span>{game.datePlayed ?? game.savedAt}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
