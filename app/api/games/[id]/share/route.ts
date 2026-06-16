import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { enableGameSharing } from "@/lib/games/queries";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(
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

    const game = await enableGameSharing(id, user.id);
    if (!game || !game.shareToken) {
      return jsonError("Game not found", 404);
    }

    return NextResponse.json({
      shareToken: game.shareToken,
      shareUrl: `/share/${game.shareToken}`,
    });
  } catch (error) {
    console.error("Failed to enable game sharing:", error);

    return jsonError("Failed to enable sharing", 500);
  }
}
