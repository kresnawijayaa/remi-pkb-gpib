"use client";

import { useRouter } from "next/navigation";

export function ViewerRefreshButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="border border-background/20 bg-foreground px-2 py-1.5 text-sm font-semibold text-background transition hover:bg-background/10 active:translate-y-px"
    >
      Refresh
    </button>
  );
}
