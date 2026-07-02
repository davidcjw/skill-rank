import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/skills";
import { saveSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/** Constant-time string comparison to avoid leaking the secret via timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Daily refresh, invoked by Vercel Cron (see vercel.json). Drops the cached
 * source responses, recomputes the ranking, and stores a snapshot so tomorrow's
 * board can show movement. Requires CRON_SECRET: the endpoint fails closed and
 * returns 401 when the secret is unset or the request does not present it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Fail closed: without a configured secret, refuse all requests so the
  // expensive refetch/snapshot cannot be triggered by anonymous callers.
  if (!secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (!auth || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Invalidate cached source fetches so the recompute pulls fresh data.
  // Next 16 requires a cache-life profile; expire:0 marks entries stale now.
  revalidateTag("skills", { expire: 0 });

  const board = await getLeaderboard();
  const saved = await saveSnapshot(board.skills);

  return NextResponse.json({
    ok: true,
    ranked: board.skills.length,
    liveSources: board.liveSources,
    usedFallback: board.usedFallback,
    snapshotSaved: saved,
    updatedAt: board.updatedAt,
  });
}
