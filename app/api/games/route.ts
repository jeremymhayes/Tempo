import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type IncomingMove = {
  moveNumber: number;
  color: string;
  san: string;
  fenBefore: string;
  fenAfter: string;
};

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        moves: {
          orderBy: [
            { moveNumber: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Failed to fetch games:", error);

    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      pgn,
      whiteName,
      blackName,
      result,
      event,
      site,
      playedAt,
      moves = [],
    } = body;

    if (!pgn || typeof pgn !== "string") {
      return NextResponse.json(
        { error: "PGN is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(moves)) {
      return NextResponse.json(
        { error: "moves must be an array" },
        { status: 400 }
      );
    }

    const game = await prisma.game.create({
      data: {
        pgn,
        whiteName: whiteName ?? null,
        blackName: blackName ?? null,
        result: result ?? null,
        event: event ?? null,
        site: site ?? null,
        playedAt: playedAt ? new Date(playedAt) : null,
        moves: {
          create: moves.map((move: IncomingMove) => ({
            moveNumber: move.moveNumber,
            color: move.color,
            san: move.san,
            fenBefore: move.fenBefore,
            fenAfter: move.fenAfter,
          })),
        },
      },
      include: {
        moves: true,
      },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("Failed to create game:", error);

    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

