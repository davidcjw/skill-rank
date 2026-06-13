import { fetchGithubCandidates } from "./sources/github";
import { fetchHackerNewsCandidates } from "./sources/hackernews";
import { fetchNpmCandidates } from "./sources/npm";
import { rankSkills } from "./rank";
import { isRelevantSkill } from "./relevance";
import { SEED_CANDIDATES } from "./seed";
import { getPreviousRanks } from "./snapshot";
import type { Leaderboard, SkillCandidate, SourceKey } from "./types";

const DAY_MS = 86_400_000;

/** Below this many live candidates we assume sources are down and use the seed. */
const MIN_LIVE_CANDIDATES = 8;

/**
 * Build the full leaderboard: gather every source, merge + rank, and compute
 * movement against the latest snapshot. Resilient — any dead source is skipped,
 * and a total wipeout falls back to the curated seed so the page still renders.
 */
export async function getLeaderboard(): Promise<Leaderboard> {
  const [github, npm, hn, previousRanks] = await Promise.all([
    fetchGithubCandidates(),
    fetchNpmCandidates(),
    fetchHackerNewsCandidates(),
    getPreviousRanks(),
  ]);

  const liveSources: SourceKey[] = [];
  if (github.length) liveSources.push("github");
  if (npm.length) liveSources.push("npm");
  if (hn.length) liveSources.push("community");

  // Gate out general-purpose AI tooling that broad searches drag in.
  let candidates: SkillCandidate[] = [...github, ...npm, ...hn].filter(
    isRelevantSkill,
  );
  let usedFallback = false;

  if (candidates.length < MIN_LIVE_CANDIDATES) {
    candidates = SEED_CANDIDATES;
    usedFallback = true;
  }

  const skills = rankSkills(candidates, previousRanks).slice(0, 50);

  const now = Date.now();
  return {
    skills,
    updatedAt: new Date(now).toISOString(),
    nextUpdateAt: new Date(now + DAY_MS).toISOString(),
    liveSources,
    usedFallback,
  };
}
