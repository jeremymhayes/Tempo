import { NextRequest, NextResponse } from "next/server";
import { GameSourceError, resolveGameSource } from "@/lib/import/game-source";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const source =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { source?: unknown }).source
      : undefined;
  if (typeof source !== "string") {
    return jsonError("Game source is required", 400);
  }

  try {
    return NextResponse.json(await resolveGameSource(source));
  } catch (error) {
    if (error instanceof GameSourceError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to import game source:", error);
    return jsonError("Failed to import game source", 500);
  }
}
