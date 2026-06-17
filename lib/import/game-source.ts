export type GameSourceProvider = "pgn" | "lichess" | "chess.com";

export type ResolvedGameSource = {
  pgn: string;
  provider: GameSourceProvider;
  sourceType: "pgn" | "url";
  normalizedUrl?: string;
};

type GameSourceFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

type ResolveDeps = {
  fetch?: GameSourceFetch;
};

type ChessComGameUrl = {
  gameId: string;
  kind: "live" | "daily" | "computer";
};

type ChessComArchiveGame = {
  uuid?: unknown;
  url?: unknown;
  pgn?: unknown;
  rules?: unknown;
};

export class GameSourceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameSourceError";
    this.status = status;
  }
}

const MAX_SOURCE_LENGTH = 200_000;
const REQUEST_HEADERS = {
  accept: "application/x-chess-pgn,text/plain,application/json",
  "user-agent": "Tempo chess review importer",
};

function trimSource(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) throw new GameSourceError("Paste a PGN or game link to review.");
  if (trimmed.length > MAX_SOURCE_LENGTH) {
    throw new GameSourceError("That game source is too large to import.");
  }
  return trimmed;
}

function asHttpUrl(source: string): URL | null {
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function hostWithoutWww(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function requireFetch(deps: ResolveDeps): GameSourceFetch {
  const fetcher = deps.fetch ?? globalThis.fetch;
  if (!fetcher) {
    throw new GameSourceError("Game links cannot be imported in this environment.", 500);
  }
  return fetcher;
}

async function fetchText(
  fetcher: GameSourceFetch,
  url: string,
  provider: GameSourceProvider,
): Promise<string> {
  const response = await fetcher(url, { headers: REQUEST_HEADERS });
  if (!response.ok) {
    throw new GameSourceError(
      `${provider} did not return a downloadable PGN for that link.`,
      response.status === 404 ? 404 : 502,
    );
  }
  return response.text();
}

async function fetchJson(
  fetcher: GameSourceFetch,
  url: string,
  provider: GameSourceProvider,
): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { ...REQUEST_HEADERS, accept: "application/json" },
  });
  if (!response.ok) {
    throw new GameSourceError(
      `${provider} did not return public game data for that link.`,
      response.status === 404 ? 404 : 502,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new GameSourceError(`${provider} returned unreadable game data.`, 502);
  }
}

function normalizeFetchedPgn(text: string, provider: GameSourceProvider): string {
  const pgn = text.replace(/^\uFEFF/, "").trim();
  if (!pgn) throw new GameSourceError(`${provider} returned an empty PGN.`, 502);

  const gameCount = (pgn.match(/(?:^|\r?\n)\[Event\s+"/g) ?? []).length;
  if (gameCount > 1) {
    throw new GameSourceError(
      "That link contains multiple games. Paste a single game link instead.",
    );
  }

  return pgn;
}

export function parseLichessGameId(url: URL): string | null {
  if (hostWithoutWww(url) !== "lichess.org") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const candidate =
    parts[0] === "game" && parts[1] === "export" ? parts[2] : parts[0];

  if (!candidate || !/^[A-Za-z0-9]{8,12}$/.test(candidate)) return null;
  return candidate.slice(0, 8);
}

export function buildLichessExportUrl(gameId: string): string {
  const url = new URL(`https://lichess.org/game/export/${gameId}`);
  url.searchParams.set("moves", "true");
  url.searchParams.set("tags", "true");
  url.searchParams.set("clocks", "false");
  url.searchParams.set("evals", "false");
  url.searchParams.set("opening", "true");
  url.searchParams.set("literate", "false");
  return url.toString();
}

export function parseChessComGameUrl(url: URL): ChessComGameUrl | null {
  if (hostWithoutWww(url) !== "chess.com") return null;

  const path = url.pathname;
  const computerMatch =
    path.match(/^\/game\/computer\/(\d+)/) ??
    path.match(/^\/analysis\/game\/computer\/(\d+)/);
  if (computerMatch) {
    return { kind: "computer", gameId: computerMatch[1] };
  }

  const match =
    path.match(/^\/game\/(live|daily)\/(\d+)/) ??
    path.match(/^\/analysis\/game\/(live|daily)\/(\d+)/) ??
    path.match(/^\/(live)\/game\/(\d+)/);

  if (!match) return null;
  return { kind: match[1] as "live" | "daily", gameId: match[2] };
}

function chessComComputerAnalysisUrl(gameId: string): string {
  const url = new URL(`https://www.chess.com/analysis/game/computer/${gameId}`);
  url.searchParams.set("move", "0");
  return url.toString();
}

function chessComArchiveUrl(username: string, year: string, month: string) {
  return `https://api.chess.com/pub/player/${encodeURIComponent(
    username,
  )}/games/${year}/${month}`;
}

function getObjectValue(record: unknown, key: string): unknown {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return undefined;
  }
  return (record as Record<string, unknown>)[key];
}

function chessComCallbackUrls(game: ChessComGameUrl): string[] {
  if (game.kind === "computer") return [];

  const primary = `https://www.chess.com/callback/${game.kind}/game/${game.gameId}`;
  const fallbackKind = game.kind === "live" ? "daily" : "live";
  return [
    primary,
    `https://www.chess.com/callback/${fallbackKind}/game/${game.gameId}`,
  ];
}

function findChessComArchiveGame(
  games: unknown,
  uuid: string | null,
  gameId: string,
): ChessComArchiveGame | null {
  if (!Array.isArray(games)) return null;

  return (
    games.find((game) => {
      if (!game || typeof game !== "object" || Array.isArray(game)) return false;
      const candidate = game as ChessComArchiveGame;
      return (
        (uuid && candidate.uuid === uuid) ||
        (typeof candidate.url === "string" && candidate.url.includes(gameId))
      );
    }) ?? null
  );
}

function decodeJsStringLiteralContent(raw: string): string {
  return JSON.parse(
    `"${raw.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`,
  ) as string;
}

function extractChessComAnalysisPgn(html: string): string | null {
  const match = /\bpgn:\s*'((?:\\.|[^'\\])*)'/.exec(html);
  if (!match) return null;

  try {
    return decodeJsStringLiteralContent(match[1]);
  } catch {
    return null;
  }
}

async function resolveChessComComputerGameUrl(
  gameUrl: ChessComGameUrl,
  fetcher: GameSourceFetch,
): Promise<ResolvedGameSource> {
  const normalizedUrl = chessComComputerAnalysisUrl(gameUrl.gameId);
  const html = await fetchText(fetcher, normalizedUrl, "chess.com");
  const pgn = extractChessComAnalysisPgn(html);
  if (!pgn) {
    throw new GameSourceError(
      "Chess.com did not expose a public PGN for that computer game.",
      404,
    );
  }

  return {
    pgn: normalizeFetchedPgn(pgn, "chess.com"),
    provider: "chess.com",
    sourceType: "url",
    normalizedUrl,
  };
}

async function resolveChessComGameUrl(
  gameUrl: ChessComGameUrl,
  fetcher: GameSourceFetch,
): Promise<ResolvedGameSource> {
  if (gameUrl.kind === "computer") {
    return resolveChessComComputerGameUrl(gameUrl, fetcher);
  }

  let callbackGame: unknown = null;

  for (const callbackUrl of chessComCallbackUrls(gameUrl)) {
    try {
      const body = await fetchJson(fetcher, callbackUrl, "chess.com");
      callbackGame = getObjectValue(body, "game");
      if (callbackGame) break;
    } catch (error) {
      if (error instanceof GameSourceError && error.status === 404) continue;
      throw error;
    }
  }

  if (!callbackGame) {
    throw new GameSourceError("Chess.com could not find a public game for that link.", 404);
  }

  const directPgn = getObjectValue(callbackGame, "pgn");
  if (typeof directPgn === "string" && directPgn.trim()) {
    return {
      pgn: normalizeFetchedPgn(directPgn, "chess.com"),
      provider: "chess.com",
      sourceType: "url",
    };
  }

  const headers =
    getObjectValue(callbackGame, "pgnHeaders") ??
    getObjectValue(callbackGame, "pgnHeader");
  const date = getObjectValue(headers, "Date");
  const white = getObjectValue(headers, "White");
  const black = getObjectValue(headers, "Black");
  const uuid = getObjectValue(callbackGame, "uuid");

  if (typeof date !== "string" || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
    throw new GameSourceError("Chess.com did not expose a public archive date for that game.");
  }

  const username =
    typeof white === "string" && white.trim()
      ? white.trim()
      : typeof black === "string" && black.trim()
        ? black.trim()
        : "";
  if (!username) {
    throw new GameSourceError("Chess.com did not expose a player archive for that game.");
  }

  const [year, month] = date.split(".");
  const archiveUrl = chessComArchiveUrl(username, year, month);
  const archive = await fetchJson(fetcher, archiveUrl, "chess.com");
  const archiveGame = findChessComArchiveGame(
    getObjectValue(archive, "games"),
    typeof uuid === "string" ? uuid : null,
    gameUrl.gameId,
  );

  if (!archiveGame || typeof archiveGame.pgn !== "string") {
    throw new GameSourceError(
      "Chess.com found the game, but its public PGN archive is not available yet.",
      404,
    );
  }

  return {
    pgn: normalizeFetchedPgn(archiveGame.pgn, "chess.com"),
    provider: "chess.com",
    sourceType: "url",
    normalizedUrl: archiveUrl,
  };
}

async function resolveChessComApiUrl(
  url: URL,
  fetcher: GameSourceFetch,
): Promise<ResolvedGameSource> {
  const path = url.pathname;
  const monthlyMatch = path.match(
    /^\/pub\/player\/([^/]+)\/games\/(\d{4})\/(\d{2})(\/pgn)?$/,
  );
  if (!monthlyMatch) {
    throw new GameSourceError(
      "Only Chess.com game links and public monthly game archive links are supported.",
    );
  }

  if (monthlyMatch[4]) {
    const pgn = await fetchText(fetcher, url.toString(), "chess.com");
    return {
      pgn: normalizeFetchedPgn(pgn, "chess.com"),
      provider: "chess.com",
      sourceType: "url",
      normalizedUrl: url.toString(),
    };
  }

  const archive = await fetchJson(fetcher, url.toString(), "chess.com");
  const games = getObjectValue(archive, "games");
  if (!Array.isArray(games) || games.length === 0) {
    throw new GameSourceError("That Chess.com archive does not contain any games.");
  }
  if (games.length > 1) {
    throw new GameSourceError(
      "That Chess.com archive contains multiple games. Paste a single game link instead.",
    );
  }

  const game = games[0] as ChessComArchiveGame;
  if (typeof game.pgn !== "string") {
    throw new GameSourceError("That Chess.com archive game does not include a PGN.");
  }

  return {
    pgn: normalizeFetchedPgn(game.pgn, "chess.com"),
    provider: "chess.com",
    sourceType: "url",
    normalizedUrl: url.toString(),
  };
}

export async function resolveGameSource(
  source: string,
  deps: ResolveDeps = {},
): Promise<ResolvedGameSource> {
  const trimmed = trimSource(source);
  const url = asHttpUrl(trimmed);
  if (!url) {
    return { pgn: trimmed, provider: "pgn", sourceType: "pgn" };
  }

  const fetcher = requireFetch(deps);
  const host = hostWithoutWww(url);

  if (host === "lichess.org") {
    const gameId = parseLichessGameId(url);
    if (!gameId) {
      throw new GameSourceError("Paste a direct Lichess game link.");
    }
    const exportUrl = buildLichessExportUrl(gameId);
    const pgn = await fetchText(fetcher, exportUrl, "lichess");
    return {
      pgn: normalizeFetchedPgn(pgn, "lichess"),
      provider: "lichess",
      sourceType: "url",
      normalizedUrl: exportUrl,
    };
  }

  if (host === "chess.com") {
    const chessComGameUrl = parseChessComGameUrl(url);
    if (!chessComGameUrl) {
      throw new GameSourceError("Paste a Chess.com game link, not a general page.");
    }
    return resolveChessComGameUrl(chessComGameUrl, fetcher);
  }

  if (url.hostname.toLowerCase() === "api.chess.com") {
    return resolveChessComApiUrl(url, fetcher);
  }

  throw new GameSourceError("Only Chess.com and Lichess game links are supported.");
}
