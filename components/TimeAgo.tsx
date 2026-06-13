"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/** Renders relative time, resolved on the client to avoid SSR clock skew. */
export function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLabel(timeAgo(iso, Date.now()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <span suppressHydrationWarning>{label ?? "syncing…"}</span>
  );
}
