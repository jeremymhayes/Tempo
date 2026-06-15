"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void logout()}
      className="w-full justify-start px-2 text-zinc-400"
    >
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
