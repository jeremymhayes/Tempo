"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateUserAction, type UpdateUserState } from "@/lib/admin/actions";

const INITIAL: UpdateUserState = {};

export function UserEditForm({
  userId,
  email,
  verified,
}: {
  userId: string;
  email: string;
  verified: boolean;
}) {
  const [state, action, pending] = useActionState(updateUserAction, INITIAL);
  const [isVerified, setIsVerified] = useState(verified);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          required
          className="h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus-visible:border-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-600"
        />
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name="verified"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          className="size-4 rounded border-zinc-700 bg-zinc-950 accent-zinc-200"
        />
        <span className="text-sm text-zinc-300">Email verified</span>
      </label>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.error ? (
          <span className="text-xs text-red-400">{state.error}</span>
        ) : state.message ? (
          <span className="text-xs text-emerald-400">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
