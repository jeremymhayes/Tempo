import { AppShell } from "@/components/layout/app-shell";
import { ReviewClient } from "@/components/review/review-client";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  return (
    <AppShell mainClassName="min-h-0 overflow-hidden p-0">
      <ReviewClient />
    </AppShell>
  );
}
