import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, MailCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function safeRedirectTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function statusMessage(status: string | undefined, sent: string | undefined) {
  if (status === "verified") {
    return {
      tone: "success" as const,
      text: "Congrats you are now verified.",
    };
  }

  if (status === "expired") {
    return {
      tone: "error" as const,
      text: "That verification link expired. Send a new one below.",
    };
  }

  if (status === "invalid") {
    return {
      tone: "error" as const,
      text: "That verification link is invalid or has already been used.",
    };
  }

  if (status === "send-failed") {
    return {
      tone: "error" as const,
      text: "Your account was created, but the verification email could not be sent. Check the email settings and resend.",
    };
  }

  if (sent === "1") {
    return {
      tone: "success" as const,
      text: "We sent a verification link to your email address.",
    };
  }

  return {
    tone: "neutral" as const,
    text: "Verify your email address before saving or reviewing games.",
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirectTo?: string;
    sent?: string;
    status?: string;
  }>;
}) {
  const [{ redirectTo, sent, status }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const target = safeRedirectTo(redirectTo);

  if (user?.emailVerifiedAt && status !== "verified") {
    redirect(target);
  }

  const message = statusMessage(status, sent);

  return (
    <AppShell title="Verify Email" description="Confirm account ownership">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            {message.tone === "error" ? (
              <AlertCircle className="mt-1 size-5 shrink-0 text-red-300" />
            ) : (
              <MailCheck className="mt-1 size-5 shrink-0 text-emerald-300" />
            )}
            <div>
              <p className="text-sm text-zinc-100">{message.text}</p>
              {status === "verified" ? (
                <p className="mt-1 text-sm text-zinc-500">
                  You can now save games to your Tempo account.
                </p>
              ) : user ? (
                <p className="mt-1 text-sm text-zinc-500">
                  Signed in as{" "}
                  <span className="text-zinc-300">{user.email}</span>.
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">
                  Sign in to resend the verification email.
                </p>
              )}
            </div>
          </div>

          {status === "verified" ? (
            <Link
              href={target}
              className="inline-flex h-9 items-center self-start rounded-md bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
            >
              Continue to Tempo
            </Link>
          ) : user ? (
            <ResendVerificationButton />
          ) : (
            <div className="flex gap-2">
              <Link
                href={`/sign-in?redirectTo=${encodeURIComponent("/verify-email")}`}
                className="inline-flex h-9 items-center rounded-md bg-zinc-100 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center rounded-md border border-zinc-800 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                Create account
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
