import type { SavedGameSummary } from "@/lib/api/games";

export type GameDateRange = "all" | "last30" | "last90";

export type SavedGameFilters = {
  query?: string;
  result?: string;
  opening?: string;
  minAccuracy?: number;
  maxBlunders?: number;
  dateRange?: GameDateRange;
  now?: Date;
};

function includesQuery(game: SavedGameSummary, query: string): boolean {
  const target = [
    game.white,
    game.black,
    game.event,
    game.site,
    game.openingName,
    game.openingEco,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return target.includes(query.toLowerCase());
}

function isWithinDateRange(
  savedAtIso: string | undefined,
  range: GameDateRange | undefined,
  now: Date,
): boolean {
  if (!range || range === "all") return true;
  if (!savedAtIso) return false;

  const savedAt = new Date(savedAtIso);
  if (Number.isNaN(savedAt.getTime())) return false;

  const days = range === "last30" ? 30 : 90;
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  return savedAt >= cutoff;
}

export function filterSavedGameSummaries(
  games: SavedGameSummary[],
  filters: SavedGameFilters,
): SavedGameSummary[] {
  const query = filters.query?.trim();
  const now = filters.now ?? new Date();

  return games.filter((game) => {
    if (query && !includesQuery(game, query)) return false;
    if (filters.result && filters.result !== "all" && game.result !== filters.result) {
      return false;
    }
    if (
      filters.opening &&
      filters.opening !== "all" &&
      game.openingName !== filters.opening
    ) {
      return false;
    }
    if (
      typeof filters.minAccuracy === "number" &&
      (typeof game.averageAccuracy !== "number" ||
        game.averageAccuracy < filters.minAccuracy)
    ) {
      return false;
    }
    if (
      typeof filters.maxBlunders === "number" &&
      (typeof game.blunders !== "number" || game.blunders > filters.maxBlunders)
    ) {
      return false;
    }
    return isWithinDateRange(game.savedAtIso, filters.dateRange, now);
  });
}
