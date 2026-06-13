/** 1234 → "1.2k", 1_500_000 → "1.5M". */
export function compact(n: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Human relative time, e.g. "3h ago", "just now". */
export function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Hours until an ISO timestamp, floored at 0. */
export function hoursUntil(iso: string, now: number): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - now) / 3_600_000));
}
