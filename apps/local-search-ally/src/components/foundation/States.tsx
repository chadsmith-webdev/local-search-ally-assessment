import { AlertTriangle, FileQuestion, Loader2 } from "lucide-react";
import type * as React from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="text-center">
      <FileQuestion className="mx-auto mb-3 h-8 w-8 text-carolina" aria-hidden />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children ? <div className="mt-2 text-sm text-text-secondary">{children}</div> : null}
    </Card>
  );
}

export function ErrorState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="border-status-red bg-surface">
      <AlertTriangle className="mb-3 h-6 w-6 text-status-red" aria-hidden />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children ? <div className="mt-2 text-sm text-text-secondary">{children}</div> : null}
    </Card>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-card bg-surface-3", className)} {...props} />;
}

export function LoadingState() {
  return (
    <div className="flex min-h-32 items-center justify-center text-text-secondary">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-carolina" aria-hidden />
      Rendering assessment
    </div>
  );
}
