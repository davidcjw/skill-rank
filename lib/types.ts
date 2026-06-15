/** A discoverable Claude / AI-agent skill: a repo, package, or published skill. */
export type SkillKind = "repo" | "package" | "skill";

/** The provenance buckets we surface in the UI as a contribution breakdown. */
export type SourceKey = "github" | "npm" | "community";

/** Raw, un-normalized popularity signals gathered from the web. */
export interface SkillSignals {
  /** GitHub stargazers. */
  stars: number;
  /** GitHub forks. */
  forks: number;
  /** Days since the project was last pushed/updated (lower = fresher). */
  daysSinceUpdate: number;
  /** npm downloads in the last week. */
  weeklyDownloads: number;
  /** Hacker News points summed across recent mentions (buzz). */
  hnPoints: number;
  /** Distinct community mentions — HN stories + curated "awesome" list inclusions. */
  mentions: number;
}

/** A candidate gathered from a single source before merging/ranking. */
export interface SkillCandidate {
  /** Stable canonical key used to merge duplicates across sources. */
  key: string;
  name: string;
  /** Owner / namespace, e.g. "anthropics". */
  owner?: string;
  description: string;
  url: string;
  kind: SkillKind;
  /** Topical tags (GitHub topics, npm keywords). */
  tags: string[];
  signals: Partial<SkillSignals>;
}

/** A skill after merging across sources and computing a composite score. */
export interface RankedSkill {
  key: string;
  rank: number;
  /** Movement vs. the previous snapshot. Positive = climbed. */
  delta: number | null;
  /** True when this skill was not present in the previous snapshot. */
  isNew: boolean;
  name: string;
  owner?: string;
  description: string;
  url: string;
  kind: SkillKind;
  tags: string[];
  signals: SkillSignals;
  /** Composite popularity, 0–100. */
  score: number;
  /** Percent contribution of each source to the score (sums to ~100). */
  breakdown: Record<SourceKey, number>;
}

/** The full payload the UI renders. */
export interface Leaderboard {
  skills: RankedSkill[];
  /** ISO timestamp the ranking was generated. */
  updatedAt: string;
  /** ISO timestamp the next scheduled refresh is due. */
  nextUpdateAt: string;
  /** Which live sources responded this run. */
  liveSources: SourceKey[];
  /** True when live fetches failed and we fell back to the bundled seed. */
  usedFallback: boolean;
}
