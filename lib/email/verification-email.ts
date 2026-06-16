import { getPrisma } from "@/lib/db";
import {
  buildEmailVerificationUrl,
  EMAIL_VERIFICATION_COOLDOWN_MS,
  getLatestEmailVerificationTokenCreatedAt,
  issueEmailVerificationToken,
} from "@/lib/auth/email-verification";
import { getResend } from "@/lib/email/resend";

const DEFAULT_FROM = "Tempo <onboarding@resend.dev>";

type SendVerificationEmailResult =
  | { ok: true; sent: true; id: string | null }
  | { ok: true; sent: false; alreadyVerified: true }
  | { ok: false; status: number; error: string };

function verificationEmailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    DEFAULT_FROM
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildVerificationEmail(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  const safeUrl = escapeHtml(url);

  return {
    subject: "Verify your Tempo email",
    text: [
      "Verify your Tempo email",
      "",
      "Open this link to verify your account:",
      url,
      "",
      "This link expires in 24 hours. If you did not create a Tempo account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
        <h1 style="font-size: 24px; margin: 0 0 12px;">Verify your Tempo email</h1>
        <p style="margin: 0 0 20px;">Confirm this email address to save and review your chess games privately.</p>
        <p style="margin: 0 0 24px;">
          <a href="${safeUrl}" style="display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 600;">Verify email</a>
        </p>
        <p style="font-size: 14px; color: #52525b; margin: 0 0 12px;">This link expires in 24 hours.</p>
        <p style="font-size: 12px; color: #71717a; margin: 0;">If the button does not work, paste this URL into your browser:<br><span style="word-break: break-all;">${safeUrl}</span></p>
      </div>
    `.trim(),
  };
}

export async function sendVerificationEmailForUser(
  userId: string,
  now = new Date(),
): Promise<SendVerificationEmailResult> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return { ok: false, status: 404, error: "Account not found." };
  }

  if (user.emailVerifiedAt) {
    return { ok: true, sent: false, alreadyVerified: true };
  }

  const latestTokenCreatedAt =
    await getLatestEmailVerificationTokenCreatedAt(user.id);
  if (
    latestTokenCreatedAt &&
    now.getTime() - latestTokenCreatedAt.getTime() <
      EMAIL_VERIFICATION_COOLDOWN_MS
  ) {
    return {
      ok: false,
      status: 429,
      error: "Please wait a minute before requesting another email.",
    };
  }

  const { token, tokenHash } = await issueEmailVerificationToken(user.id, now);
  const email = buildVerificationEmail(buildEmailVerificationUrl(token));

  try {
    const { data, error } = await getResend().emails.send(
      {
        from: verificationEmailFrom(),
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [{ name: "kind", value: "email_verification" }],
      },
      { idempotencyKey: `email-verification-${tokenHash}` },
    );

    if (error) {
      await prisma.emailVerificationToken
        .delete({ where: { tokenHash } })
        .catch(() => {});
      console.error("Failed to send verification email:", error);
      return {
        ok: false,
        status: error.statusCode ?? 502,
        error: "Failed to send verification email.",
      };
    }

    return { ok: true, sent: true, id: data?.id ?? null };
  } catch (error) {
    await prisma.emailVerificationToken
      .delete({ where: { tokenHash } })
      .catch(() => {});
    console.error("Failed to send verification email:", error);
    return {
      ok: false,
      status: 502,
      error: "Failed to send verification email.",
    };
  }
}
