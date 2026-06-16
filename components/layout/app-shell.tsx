import * as React from "react";
import { Sidebar } from "./sidebar";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

/**
 * Top-level page chrome: persistent sidebar + scrollable content area.
 * `title` / `description` render a compact page header above the content.
 */
export async function AppShell({
  title,
  description,
  actions,
  mainClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  mainClassName?: string;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <Sidebar user={user} isAdmin={isAdmin} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {title ? (
          <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-6">
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">{title}</h1>
              {description ? (
                <p className="text-xs text-zinc-500">{description}</p>
              ) : null}
            </div>
            {actions}
          </header>
        ) : null}
        <main className={cn("min-w-0 flex-1 p-6", mainClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
