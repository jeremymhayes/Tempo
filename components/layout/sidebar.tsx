"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Home, ListChecks, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Import", icon: Home },
  { href: "/review", label: "Review", icon: ListChecks },
  { href: "/games", label: "Past Games", icon: Crown },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <Crown className="size-4 text-zinc-300" />
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Chess Reviewer
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
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Free chess game reviewer. Local analysis, no account required.
        </p>
      </div>
    </aside>
  );
}
