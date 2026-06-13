import type { RankedSkill } from "./types";

/**
 * Daily ranking snapshots, persisted to Supabase via its REST API so we avoid
 * pulling in the full SDK. Entirely optional: with no Supabase env configured,
 * reads return an empty map and writes are no-ops, so movement arrows simply
 * don't appear. Table schema lives in the README.
 */

const TABLE = "skill_snapshots";

function config(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

/** Most recent snapshot's key → rank map, for computing movement. */
export async function getPreviousRanks(): Promise<Map<string, number>> {
  const cfg = config();
  if (!cfg) return new Map();
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/${TABLE}?select=ranks&order=created_at.desc&limit=1`,
      {
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
        next: { revalidate: 86_400, tags: ["skills"] },
      },
    );
    if (!res.ok) return new Map();
    const rows = (await res.json()) as { ranks: Record<string, number> }[];
    return new Map(Object.entries(rows[0]?.ranks ?? {}));
  } catch {
    return new Map();
  }
}

/** Persist the current ranking as today's snapshot. Best-effort. */
export async function saveSnapshot(skills: RankedSkill[]): Promise<boolean> {
  const cfg = config();
  if (!cfg || skills.length === 0) return false;
  const ranks: Record<string, number> = {};
  for (const s of skills) ranks[s.key] = s.rank;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ranks }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
