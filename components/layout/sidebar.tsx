"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  Crown,
  Home,
  ListChecks,
  LogIn,
  MailCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  UserPlus,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";

const NAV = [
  { href: "/", label: "Import", icon: Home },
  { href: "/review", label: "Review", icon: ListChecks },
  { href: "/games", label: "Saved Games", icon: Crown },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV = { href: "/admin", label: "Admin", icon: Shield };
const COLLAPSE_QUERY = "(max-width: 767px)";

function subscribeToCollapseQuery(onChange: () => void) {
  const query = window.matchMedia(COLLAPSE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getCollapseQuerySnapshot() {
  return window.matchMedia(COLLAPSE_QUERY).matches;
}

function getCollapseQueryServerSnapshot() {
  return false;
}

export function Sidebar({
  user,
  isAdmin = false,
}: {
  user: AuthUser | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const nav = isAdmin ? [...NAV, ADMIN_NAV] : NAV;
  const autoCollapsed = useSyncExternalStore(
    subscribeToCollapseQuery,
    getCollapseQuerySnapshot,
    getCollapseQueryServerSnapshot,
  );
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const collapsed = manualCollapsed ?? autoCollapsed;
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200",
        collapsed ? "w-12" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center justify-between border-b border-zinc-800",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
        )}
      >
        {collapsed ? null : (
          <div className="flex min-w-0 items-center gap-2">
            <Clock3 className="size-4 shrink-0 text-zinc-300" />
            <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">
              Tempo
            </span>
          </div>
        )}
        <button
          type="button"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => setManualCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100",
            collapsed ? "size-8" : "size-9",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>
      <nav className={cn("flex flex-col", collapsed ? "items-center gap-2 p-2" : "gap-0.5 p-2")}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors",
                collapsed ? "size-8 justify-center p-0" : "h-9 gap-2.5 px-3",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
              )}
            >
              <Icon className="size-4" />
              {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div
        className={cn(
          "mt-auto border-t border-zinc-800",
          collapsed ? "flex flex-col items-center gap-2 p-2" : "p-3",
        )}
      >
        {user ? (
          <div
            className={cn(
              "flex flex-col gap-2",
              collapsed ? "items-center" : "",
            )}
          >
            <div
              title={collapsed ? user.email : undefined}
              className={cn(
                "flex min-w-0 items-center text-xs text-zinc-500",
                collapsed ? "justify-center" : "gap-2 px-2",
              )}
            >
              <UserRound className="size-4 shrink-0" />
              {collapsed ? null : <span className="truncate">{user.email}</span>}
            </div>
            {!user.emailVerifiedAt ? (
              <Link
                href="/verify-email"
                aria-label={collapsed ? "Verify email" : undefined}
                title={collapsed ? "Verify email" : undefined}
                className={cn(
                  "rounded-md text-amber-300 transition-colors hover:bg-zinc-900",
                  collapsed
                    ? "flex size-8 items-center justify-center"
                    : "px-2 py-1 text-xs",
                )}
              >
                {collapsed ? <MailCheck className="size-4" /> : "Verify email"}
              </Link>
            ) : null}
            <LogoutButton compact={collapsed} />
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-2",
              collapsed ? "items-center" : "",
            )}
          >
            <Link
              href="/sign-in"
              aria-label={collapsed ? "Sign in" : undefined}
              title={collapsed ? "Sign in" : undefined}
              className={cn(
                "rounded-md text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100",
                collapsed
                  ? "flex size-8 items-center justify-center"
                  : "flex items-center gap-2 px-2 py-1.5",
              )}
            >
              <LogIn className="size-4 shrink-0" />
              {collapsed ? null : <span className="truncate">Sign in</span>}
            </Link>
            <Link
              href="/sign-up"
              aria-label={collapsed ? "Create account" : undefined}
              title={collapsed ? "Create account" : undefined}
              className={cn(
                "rounded-md text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200",
                collapsed
                  ? "flex size-8 items-center justify-center"
                  : "flex items-center gap-2 px-2 py-1.5",
              )}
            >
              <UserPlus className="size-4 shrink-0" />
              {collapsed ? null : <span className="truncate">Create account</span>}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
