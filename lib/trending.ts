import type { RankedSkill } from "./types";

/** The day's standout movements, derived purely from rank deltas. */
export interface Trending {
  /** Climbed the most since yesterday (largest positive delta first). */
  risers: RankedSkill[];
  /** Dropped the most since yesterday (largest fall first). */
  fallers: RankedSkill[];
  /** Skills that entered the ranking today. */
  newcomers: RankedSkill[];
}

/**
 * Pick the biggest movers from an already-ranked board. Pure: no I/O. Skills
 * with a null delta (no movement data yet, e.g. before the first snapshot) are
 * ignored for risers/fallers; `newcomers` uses the `isNew` flag.
 */
export function selectTrending(skills: RankedSkill[], limit = 3): Trending {
  const risers = skills
    .filter((s) => !s.isNew && s.delta != null && s.delta > 0)
    .sort((a, b) => b.delta! - a.delta! || a.rank - b.rank)
    .slice(0, limit);

  const fallers = skills
    .filter((s) => s.delta != null && s.delta < 0)
    .sort((a, b) => a.delta! - b.delta! || a.rank - b.rank)
    .slice(0, limit);

  const newcomers = skills
    .filter((s) => s.isNew)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);

  return { risers, fallers, newcomers };
}

/** Whether there's anything worth rendering (hide the strip when there isn't). */
export function hasTrending(t: Trending): boolean {
  return (
    t.risers.length > 0 || t.fallers.length > 0 || t.newcomers.length > 0
  );
}
