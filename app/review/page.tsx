import { AppShell } from "@/components/layout/app-shell";
import { ReviewClient } from "@/components/review/review-client";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  return (
    <AppShell title="Review" description="Step through the loaded game">
      <ReviewClient />
    </AppShell>
  );
}
