"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/admin/queries";
import { deleteUserAction } from "@/lib/admin/actions";
import { ConfirmButton } from "./confirm-button";

type SortKey = "email" | "emailVerifiedAt" | "gameCount" | "createdAt";
type SortDir = "asc" | "desc";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <th className={cn("px-4 py-2.5 font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-zinc-200",
          active && "text-zinc-200",
        )}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ChevronsUpDown className="size-3 text-zinc-600" />
        )}
      </button>
    </th>
  );
}

export function AdminUsersTable({
  users,
  adminId,
}: {
  users: AdminUserRow[];
  adminId: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "email" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...users].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "gameCount":
          cmp = a.gameCount - b.gameCount;
          break;
        case "emailVerifiedAt":
          cmp =
            Number(Boolean(a.emailVerifiedAt)) -
            Number(Boolean(b.emailVerifiedAt));
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return cmp * factor;
    });
  }, [users, sortKey, sortDir]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
            <SortHeader
              label="User"
              col="email"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Verified"
              col="emailVerifiedAt"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortHeader
              label="Games"
              col="gameCount"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="px-4 py-2.5 font-medium">Sessions</th>
            <SortHeader
              label="Joined"
              col="createdAt"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="px-4 py-2.5 font-medium" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr
              key={u.id}
              className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="font-medium text-zinc-100 hover:underline"
                >
                  {u.email}
                </Link>
                {u.id === adminId ? (
                  <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
                    You
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2.5">
                {u.emailVerifiedAt ? (
                  <span className="text-emerald-400">Verified</span>
                ) : (
                  <span className="text-zinc-500">Unverified</span>
                )}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {u.gameCount}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-400">
                {u.sessionCount}
              </td>
              <td className="px-4 py-2.5 text-zinc-400">
                {fmtDate(u.createdAt)}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    Manage
                  </Link>
                  {u.id === adminId ? null : (
                    <ConfirmButton
                      action={deleteUserAction}
                      fields={{ userId: u.id }}
                      confirmMessage={`Permanently delete ${u.email} and all their games? This cannot be undone.`}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="size-3.5" />
                    </ConfirmButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
