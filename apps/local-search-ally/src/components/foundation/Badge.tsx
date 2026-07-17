import type * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "good" | "warning" | "danger" | "accent";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border-strong bg-surface-2 text-text-secondary",
  good: "border-status-green bg-surface-2 text-status-green",
  warning: "border-status-yellow bg-surface-2 text-status-yellow",
  danger: "border-status-red bg-surface-2 text-status-red",
  accent: "border-border-accent bg-carolina-dim text-carolina",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-card border px-2.5 text-xs font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
