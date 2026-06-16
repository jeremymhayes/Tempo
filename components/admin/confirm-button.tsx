"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type ButtonComponentProps = React.ComponentProps<typeof Button>;

/**
 * Submits a Server Action via a form, gated behind a native confirm dialog.
 * `fields` are rendered as hidden inputs so the action receives them in FormData.
 */
export function ConfirmButton({
  action,
  confirmMessage,
  fields,
  children,
  variant = "ghost",
  size = "sm",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  fields: Record<string, string>;
  children: React.ReactNode;
  variant?: ButtonComponentProps["variant"];
  size?: ButtonComponentProps["size"];
  className?: ButtonComponentProps["className"];
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size={size} className={className}>
        {children}
      </Button>
    </form>
  );
}
