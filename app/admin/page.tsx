import { Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { requireAdmin } from "@/lib/auth/admin";
import { listUsers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { error } = await searchParams;
  const users = await listUsers();

  return (
    <AppShell
      title="Admin"
      description={`Manage users and saved games · ${users.length} account${
        users.length === 1 ? "" : "s"
      }`}
    >
      {error === "self-delete" ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          You can&apos;t delete the account you&apos;re signed in as.
        </div>
      ) : null}

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title="No users yet"
          description="Accounts will appear here as people sign up."
        />
      ) : (
        <AdminUsersTable users={users} adminId={admin.id} />
      )}
    </AppShell>
  );
}
