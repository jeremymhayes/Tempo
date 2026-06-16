"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enableGameShare } from "@/lib/api/games";

export function ShareReportButton({
  gameId,
  initialShareToken,
  initialShareEnabled,
}: {
  gameId: string;
  initialShareToken: string | null;
  initialShareEnabled: boolean;
}) {
  const [shareToken, setShareToken] = useState(
    initialShareEnabled ? initialShareToken : null,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "copied" | "error">(
    "idle",
  );

  async function share() {
    setStatus("saving");
    try {
      let token = shareToken;
      if (!token) {
        const body = await enableGameShare(gameId);
        token = body.shareToken;
        setShareToken(token);
      }

      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard?.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void share()}
      disabled={status === "saving"}
      aria-live="polite"
    >
      {status === "copied" ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
      {status === "saving"
        ? "Sharing..."
        : status === "copied"
          ? "Copied"
          : "Share"}
    </Button>
  );
}
