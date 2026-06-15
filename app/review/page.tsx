import { AppShell } from "@/components/layout/app-shell";
import { ReviewClient } from "@/components/review/review-client";

export default function ReviewPage() {
  return (
    <AppShell title="Review" description="Step through the loaded game">
      <ReviewClient />
    </AppShell>
  );
}
