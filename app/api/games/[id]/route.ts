import { NextRequest, NextResponse } from "next/server";
import { getGameDetail } from "@/lib/games/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required", 401);
    }
    if (!user.emailVerifiedAt) {
      return jsonError("Email verification required", 403);
    }

    const game = await getGameDetail(id, user.id);
    if (!game) {
      return jsonError("Game not found", 404);
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Failed to fetch game:", error);

    return jsonError("Failed to fetch game", 500);
  }
}
