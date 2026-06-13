import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/skills";
import { saveSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/**
 * Daily refresh, invoked by Vercel Cron (see vercel.json). Drops the cached
 * source responses, recomputes the ranking, and stores a snapshot so tomorrow's
 * board can show movement. Protected by CRON_SECRET when set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
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
