import { NextRequest, NextResponse } from "next/server";
import { getGameDetail, updateGameReviewSnapshot } from "@/lib/games/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { isReviewSnapshot } from "@/lib/review/snapshot";

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

export async function PATCH(
  request: NextRequest,
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON", 400);
    }

    const reviewSnapshot =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { reviewSnapshot?: unknown }).reviewSnapshot
        : undefined;
    if (!isReviewSnapshot(reviewSnapshot)) {
      return jsonError("Valid reviewSnapshot is required", 400);
    }

    const game = await updateGameReviewSnapshot(id, user.id, reviewSnapshot);
    if (!game) {
      return jsonError("Game not found", 404);
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Failed to update game review:", error);

    return jsonError("Failed to update game review", 500);
  }
}
