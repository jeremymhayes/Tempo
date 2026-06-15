import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type {
  ListGameDto,
  SavedGameDetailDto,
  SavedMoveDto,
} from "@/lib/api/games";
import type { StoredGameRecord } from "@/lib/chess/pgn-record";

const MOVE_ORDER = [
  { moveNumber: "asc" },
  { color: "desc" },
] satisfies Prisma.MoveOrderByWithRelationInput[];

type GameWithMoveCount = {
  id: string;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: Date | null;
  createdAt: Date;
  _count: { moves: number };
};

type GameWithMoves = {
  id: string;
  pgn: string;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  moves: Array<{
    id: string;
    moveNumber: number;
    color: string;
    san: string;
    fenBefore: string;
    fenAfter: string;
  }>;
};

function isoDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toMoveDto(move: GameWithMoves["moves"][number]): SavedMoveDto {
  return {
    id: move.id,
    moveNumber: move.moveNumber,
    color: move.color,
    san: move.san,
    fenBefore: move.fenBefore,
    fenAfter: move.fenAfter,
  };
}

export function toListGameDto(game: GameWithMoveCount): ListGameDto {
  return {
    id: game.id,
    whiteName: game.whiteName,
    blackName: game.blackName,
    result: game.result,
    event: game.event,
    site: game.site,
    playedAt: isoDate(game.playedAt),
    createdAt: game.createdAt.toISOString(),
    moveCount: game._count.moves,
  };
}

export function toSavedGameDetailDto(game: GameWithMoves): SavedGameDetailDto {
  return {
    id: game.id,
    pgn: game.pgn,
    whiteName: game.whiteName,
    blackName: game.blackName,
    result: game.result,
    event: game.event,
    site: game.site,
    playedAt: isoDate(game.playedAt),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    moves: game.moves.map(toMoveDto),
  };
}

export async function listGameSummaries(): Promise<ListGameDto[]> {
  const prisma = getPrisma();
  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      whiteName: true,
      blackName: true,
      result: true,
      event: true,
      site: true,
      playedAt: true,
      createdAt: true,
      _count: {
        select: { moves: true },
      },
    },
  });

  return games.map(toListGameDto);
}

export async function getGameDetail(
  id: string,
): Promise<SavedGameDetailDto | null> {
  const prisma = getPrisma();
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      moves: {
        orderBy: MOVE_ORDER,
      },
    },
  });

  return game ? toSavedGameDetailDto(game) : null;
}

export async function createGame(
  parsedGame: StoredGameRecord,
): Promise<SavedGameDetailDto> {
  const prisma = getPrisma();
  const game = await prisma.game.create({
    data: {
      pgn: parsedGame.pgn,
      whiteName: parsedGame.whiteName,
      blackName: parsedGame.blackName,
      result: parsedGame.result,
      event: parsedGame.event,
      site: parsedGame.site,
      playedAt: parsedGame.playedAt,
      moves: {
        create: parsedGame.moves.map((move) => ({
          moveNumber: move.moveNumber,
          color: move.color,
          san: move.san,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
        })),
      },
    },
    include: {
      moves: {
        orderBy: MOVE_ORDER,
      },
    },
  });

  return toSavedGameDetailDto(game);
}
