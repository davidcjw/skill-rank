"use client";

import { useEffect, useState } from "react";
import { hoursUntil } from "@/lib/format";

/** Live "in Nh" countdown to the next scheduled re-rank, resolved client-side. */
export function NextRefresh({ iso }: { iso: string }) {
  const [hours, setHours] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setHours(hoursUntil(iso, Date.now()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <span suppressHydrationWarning>{hours == null ? "—" : `in ${hours}h`}</span>
  );
}
