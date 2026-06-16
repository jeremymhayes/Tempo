"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Crown, Home, ListChecks, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";

const NAV = [
  { href: "/", label: "Import", icon: Home },
  { href: "/review", label: "Review", icon: ListChecks },
  { href: "/games", label: "Saved Games", icon: Crown },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <Clock3 className="size-4 text-zinc-300" />
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Tempo
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-zinc-800 p-3">
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2 px-2 text-xs text-zinc-500">
              <UserRound className="size-4 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            {!user.emailVerifiedAt ? (
              <Link
                href="/verify-email"
                className="rounded-md px-2 py-1 text-xs text-amber-300 transition-colors hover:bg-zinc-900"
              >
                Verify email
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/sign-in"
              className="rounded-md px-2 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
