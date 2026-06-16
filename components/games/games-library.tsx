"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { SavedGameSummary } from "@/lib/api/games";
import {
  filterSavedGameSummaries,
  type GameDateRange,
} from "@/lib/games/filters";
import { GamesTable } from "./games-table";

const RESULT_OPTIONS = [
  { value: "all", label: "All results" },
  { value: "1-0", label: "White wins" },
  { value: "0-1", label: "Black wins" },
  { value: "1/2-1/2", label: "Draws" },
  { value: "*", label: "Unfinished" },
];

function numberOrUndefined(value: string): number | undefined {
  return value === "all" ? undefined : Number(value);
}

export function GamesLibrary({ games }: { games: SavedGameSummary[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("all");
  const [opening, setOpening] = useState("all");
  const [dateRange, setDateRange] = useState<GameDateRange>("all");
  const [minAccuracy, setMinAccuracy] = useState("all");
  const [maxBlunders, setMaxBlunders] = useState("all");

  const openings = useMemo(
    () =>
      Array.from(
        new Set(
          games
            .map((game) => game.openingName)
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort(),
    [games],
  );

  const filteredGames = useMemo(
    () =>
      filterSavedGameSummaries(games, {
        query,
        result,
        opening,
        dateRange,
        minAccuracy: numberOrUndefined(minAccuracy),
        maxBlunders: numberOrUndefined(maxBlunders),
      }),
    [dateRange, games, maxBlunders, minAccuracy, opening, query, result],
  );

  function clearFilters() {
    setQuery("");
    setResult("all");
    setOpening("all");
    setDateRange("all");
    setMinAccuracy("all");
    setMaxBlunders("all");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(120px,150px))_auto]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player, event, opening"
          aria-label="Search saved games"
        />
        <Select value={result} onValueChange={setResult}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESULT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={opening} onValueChange={setOpening}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Opening" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All openings</SelectItem>
            {openings.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={dateRange}
          onValueChange={(value) => setDateRange(value as GameDateRange)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any date</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="last90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minAccuracy} onValueChange={setMinAccuracy}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any accuracy</SelectItem>
            <SelectItem value="70">70%+</SelectItem>
            <SelectItem value="80">80%+</SelectItem>
            <SelectItem value="90">90%+</SelectItem>
          </SelectContent>
        </Select>
        <Select value={maxBlunders} onValueChange={setMaxBlunders}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any blunders</SelectItem>
            <SelectItem value="0">0 blunders</SelectItem>
            <SelectItem value="1">1 or fewer</SelectItem>
            <SelectItem value="2">2 or fewer</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={clearFilters}>
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <SlidersHorizontal className="size-3.5" />
        <span>
          {filteredGames.length} of {games.length} games
        </span>
      </div>

      {filteredGames.length ? (
        <GamesTable games={filteredGames} />
      ) : (
        <EmptyState
          title="No games match those filters"
          description="Clear one or more filters to widen the saved-game list."
        />
      )}
    </div>
  );
}
