import { AppShell } from "@/components/layout/app-shell";
import { ReviewClient } from "@/components/review/review-client";
import { requireVerifiedUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  await requireVerifiedUser("/review");

  return (
    <AppShell title="Review" description="Step through the loaded game">
      <ReviewClient />
    </AppShell>
  );
}
