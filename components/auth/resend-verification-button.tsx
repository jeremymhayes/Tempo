"use client";

import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function resend() {
    setStatus(null);
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        alreadyVerified?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Could not send verification email.",
        );
      }

      if (body.alreadyVerified === true) {
        router.push("/");
        router.refresh();
        return;
      }

      setStatus("Verification email sent.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send verification email.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={resend} disabled={submitting}>
        <MailCheck className="size-4" />
        {submitting ? "Sending..." : "Resend email"}
      </Button>
      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
