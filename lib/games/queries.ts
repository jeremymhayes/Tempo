import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { deriveOpeningBreakdown } from "@/lib/chess/openings";
import type {
  ListGameDto,
  SavedGameDetailDto,
  SavedMoveDto,
} from "@/lib/api/games";
import {
  storedGameToParsedGame,
  type StoredGameRecord,
} from "@/lib/chess/pgn-record";
import { createShareToken } from "@/lib/games/share-token";
import {
  averageAccuracy,
  createReviewSnapshot,
  isReviewSnapshot,
  type ReviewSnapshot,
} from "@/lib/review/snapshot";

const MOVE_ORDER = [
  { moveNumber: "asc" },
  { color: "desc" },
] satisfies Prisma.MoveOrderByWithRelationInput[];

type GameWithMoveCount = {
  id: string;
  userId: string | null;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: Date | null;
  openingName: string | null;
  openingEco: string | null;
  bookExitPly: number | null;
  bookExitMove: string | null;
  averageAccuracy: number | null;
  blunders: number | null;
  shareEnabled: boolean;
  createdAt: Date;
  _count: { moves: number };
};

type GameWithMoves = {
  id: string;
  userId: string | null;
  pgn: string;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: Date | null;
  openingName: string | null;
  openingEco: string | null;
  bookExitPly: number | null;
  bookExitMove: string | null;
  reviewSnapshot: unknown;
  reviewSnapshotUpdatedAt: Date | null;
  shareToken: string | null;
  shareEnabled: boolean;
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

function toReviewSnapshot(value: unknown): ReviewSnapshot | null {
  return isReviewSnapshot(value) ? value : null;
}

export function reviewSnapshotPersistenceFields(snapshot: ReviewSnapshot): {
  averageAccuracy: number | null;
  blunders: number;
} {
  return {
    averageAccuracy: averageAccuracy(snapshot.stats) ?? null,
    blunders: snapshot.blunders,
  };
}

export function toListGameDto(game: GameWithMoveCount): ListGameDto {
  return {
    id: game.id,
    userId: game.userId,
    whiteName: game.whiteName,
    blackName: game.blackName,
    result: game.result,
    event: game.event,
    site: game.site,
    playedAt: isoDate(game.playedAt),
    createdAt: game.createdAt.toISOString(),
    openingName: game.openingName,
    openingEco: game.openingEco,
    bookExitPly: game.bookExitPly,
    bookExitMove: game.bookExitMove,
    averageAccuracy: game.averageAccuracy,
    blunders: game.blunders,
    shareEnabled: game.shareEnabled,
    moveCount: game._count.moves,
  };
}

export function toSavedGameDetailDto(game: GameWithMoves): SavedGameDetailDto {
  return {
    id: game.id,
    userId: game.userId,
    pgn: game.pgn,
    whiteName: game.whiteName,
    blackName: game.blackName,
    result: game.result,
    event: game.event,
    site: game.site,
    playedAt: isoDate(game.playedAt),
    openingName: game.openingName,
    openingEco: game.openingEco,
    bookExitPly: game.bookExitPly,
    bookExitMove: game.bookExitMove,
    reviewSnapshot: toReviewSnapshot(game.reviewSnapshot),
    reviewSnapshotUpdatedAt: isoDate(game.reviewSnapshotUpdatedAt),
    shareToken: game.shareToken,
    shareEnabled: game.shareEnabled,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    moves: game.moves.map(toMoveDto),
  };
}

export async function listGameSummaries(userId: string): Promise<ListGameDto[]> {
  const prisma = getPrisma();
  const games = await prisma.game.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      whiteName: true,
      blackName: true,
      result: true,
      event: true,
      site: true,
      playedAt: true,
      openingName: true,
      openingEco: true,
      bookExitPly: true,
      bookExitMove: true,
      averageAccuracy: true,
      blunders: true,
      shareEnabled: true,
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
  userId: string,
): Promise<SavedGameDetailDto | null> {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({
    where: { id, userId },
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
  userId: string,
): Promise<SavedGameDetailDto> {
  const prisma = getPrisma();
  const reviewGame = storedGameToParsedGame(parsedGame);
  const opening = deriveOpeningBreakdown(reviewGame.moves);
  const reviewSnapshot = createReviewSnapshot(reviewGame);
  const reviewFields = reviewSnapshotPersistenceFields(reviewSnapshot);

  const game = await prisma.game.create({
    data: {
      userId,
      pgn: parsedGame.pgn,
      whiteName: parsedGame.whiteName,
      blackName: parsedGame.blackName,
      result: parsedGame.result,
      event: parsedGame.event,
      site: parsedGame.site,
      playedAt: parsedGame.playedAt,
      openingName: opening.name,
      openingEco: opening.eco,
      bookExitPly: opening.bookExitPly,
      bookExitMove: opening.bookExitMove,
      reviewSnapshot: reviewSnapshot as unknown as Prisma.InputJsonValue,
      reviewSnapshotUpdatedAt: new Date(),
      averageAccuracy: reviewFields.averageAccuracy,
      blunders: reviewFields.blunders,
      shareToken: createShareToken(),
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

export async function updateGameReviewSnapshot(
  id: string,
  userId: string,
  reviewSnapshot: ReviewSnapshot,
): Promise<SavedGameDetailDto | null> {
  const prisma = getPrisma();
  const existing = await prisma.game.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const reviewFields = reviewSnapshotPersistenceFields(reviewSnapshot);
  const game = await prisma.game.update({
    where: { id },
    data: {
      reviewSnapshot: reviewSnapshot as unknown as Prisma.InputJsonValue,
      reviewSnapshotUpdatedAt: new Date(),
      averageAccuracy: reviewFields.averageAccuracy,
      blunders: reviewFields.blunders,
    },
    include: {
      moves: {
        orderBy: MOVE_ORDER,
      },
    },
  });

  return toSavedGameDetailDto(game);
}

export async function enableGameSharing(
  id: string,
  userId: string,
): Promise<SavedGameDetailDto | null> {
  const prisma = getPrisma();
  const existing = await prisma.game.findFirst({
    where: { id, userId },
    select: { shareToken: true },
  });
  if (!existing) return null;

  const game = await prisma.game.update({
    where: { id },
    data: {
      shareEnabled: true,
      shareToken: existing.shareToken ?? createShareToken(),
    },
    include: {
      moves: {
        orderBy: MOVE_ORDER,
      },
    },
  });

  return toSavedGameDetailDto(game);
}

export async function getSharedGameDetail(
  token: string,
): Promise<SavedGameDetailDto | null> {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({
    where: { shareToken: token, shareEnabled: true },
    include: {
      moves: {
        orderBy: MOVE_ORDER,
      },
    },
  });

  return game ? toSavedGameDetailDto(game) : null;
}
