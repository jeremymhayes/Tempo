import { NextRequest, NextResponse } from "next/server";
import { parsePgnForStorage } from "@/lib/chess/pgn-record";
import { createGame, listGameSummaries } from "@/lib/games/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required", 401);
    }

    return NextResponse.json(await listGameSummaries(user.id));
  } catch (error) {
    console.error("Failed to fetch games:", error);

    return jsonError("Failed to fetch games", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON", 400);
    }

    const pgn =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { pgn?: unknown }).pgn
        : undefined;
    if (!pgn || typeof pgn !== "string") {
      return jsonError("PGN is required", 400);
    }

    const parsed = parsePgnForStorage(pgn);
    if (!parsed.ok) {
      return jsonError(parsed.error, 400);
    }

    return NextResponse.json(await createGame(parsed.game, user.id), {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create game:", error);

    return jsonError("Failed to create game", 500);
  }
}

