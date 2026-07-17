import type * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-border-accent bg-carolina-dim p-4 text-sm text-text-secondary", className)}
      role="status"
      {...props}
    />
  );
}
