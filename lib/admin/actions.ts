"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { normalizeEmail } from "@/lib/auth/crypto";

export type UpdateUserState = { error?: string; message?: string };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Edit a user's email and verified status. Used with `useActionState`. */
export async function updateUserAction(
  _prevState: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  await requireAdmin();

  const userId = formData.get("userId");
  const rawEmail = formData.get("email");
  const verified = formData.get("verified") === "on";

  if (typeof userId !== "string" || !userId) {
    return { error: "Missing user id." };
  }
  if (typeof rawEmail !== "string") {
    return { error: "Email is required." };
  }

  const emailResult = normalizeEmail(rawEmail);
  if (!emailResult.ok) {
    return { error: emailResult.error };
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  });
  if (!existing) {
    return { error: "User not found." };
  }

  // Preserve the original verification timestamp when already verified;
  // stamp "now" when an admin flips an unverified account to verified.
  const emailVerifiedAt = verified
    ? (existing.emailVerifiedAt ?? new Date())
    : null;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { email: emailResult.email, emailVerifiedAt },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Another account already uses that email." };
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);

  return { message: "Saved." };
}

/** Delete a user and all their sessions/games (cascade). */
export async function deleteUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    redirect("/admin");
  }
  if (userId === admin.id) {
    redirect("/admin?error=self-delete");
  }

  await getPrisma()
    .user.delete({ where: { id: userId } })
    .catch(() => {});

  revalidatePath("/admin");
  redirect("/admin");
}

/** Delete a single saved game. */
export async function deleteGameAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const gameId = formData.get("gameId");
  const userId = formData.get("userId");
  if (typeof gameId !== "string" || !gameId) {
    return;
  }

  await getPrisma()
    .game.delete({ where: { id: gameId } })
    .catch(() => {});

  revalidatePath("/admin");
  if (typeof userId === "string" && userId) {
    revalidatePath(`/admin/users/${userId}`);
  }
}
