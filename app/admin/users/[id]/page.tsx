import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { AdminGamesTable } from "@/components/admin/admin-games-table";
import { requireAdmin } from "@/lib/auth/admin";
import { getUserDetail } from "@/lib/admin/queries";
import { deleteUserAction } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const isSelf = user.id === admin.id;

  return (
    <AppShell title={user.email} description={`User · joined ${fmtDate(user.createdAt)}`}>
      <div className="mb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="size-3.5" />
          Back to all users
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <UserEditForm
                userId={user.id}
                email={user.email}
                verified={Boolean(user.emailVerifiedAt)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
              <Row
                label="Verified"
                value={
                  user.emailVerifiedAt
                    ? fmtDate(user.emailVerifiedAt)
                    : "Not verified"
                }
              />
              <Row label="Active sessions" value={String(user.sessionCount)} />
              <Row label="Saved games" value={String(user.games.length)} />
              <Row label="Last updated" value={fmtDate(user.updatedAt)} />
            </CardContent>
          </Card>

          <Card className="border-red-500/30">
            <CardHeader className="border-red-500/30">
              <CardTitle className="text-red-300">Danger zone</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-400">
                {isSelf
                  ? "You can't delete the account you're signed in as."
                  : "Permanently delete this user, their sessions, and all saved games."}
              </p>
              {isSelf ? null : (
                <ConfirmButton
                  action={deleteUserAction}
                  fields={{ userId: user.id }}
                  confirmMessage={`Permanently delete ${user.email} and all their games? This cannot be undone.`}
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-red-500/40 text-red-300 hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
                >
                  Delete user
                </ConfirmButton>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Saved games ({user.games.length})
          </h2>
          {user.games.length === 0 ? (
            <EmptyState
              icon={<Crown className="size-8" />}
              title="No saved games"
              description="This user hasn't saved any games yet."
            />
          ) : (
            <AdminGamesTable userId={user.id} games={user.games} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-300">{value}</span>
    </div>
  );
}
