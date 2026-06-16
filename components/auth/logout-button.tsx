"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      onClick={() => void logout()}
      aria-label="Sign out"
      title={compact ? "Sign out" : undefined}
      className={cn(
        "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
        compact ? "size-8" : "w-full justify-start px-2",
        className,
      )}
    >
      <LogOut className="size-4" />
      {compact ? null : "Sign out"}
    </Button>
  );
}
