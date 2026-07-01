import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", children }: { className?: string; tone?: "neutral" | "good" | "warn" | "danger"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-1 text-xs font-semibold uppercase tracking-normal",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "danger" && "border-red-200 bg-red-50 text-red-800",
        className
      )}
    >
      {children}
    </span>
  );
}
