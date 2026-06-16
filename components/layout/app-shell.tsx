import * as React from "react";
import { Sidebar } from "./sidebar";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";

/**
 * Top-level page chrome: persistent sidebar + scrollable content area.
 * `title` / `description` render a compact page header above the content.
 */
export async function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <Sidebar user={user} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
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
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
