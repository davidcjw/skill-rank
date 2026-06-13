import type {
  RankedSkill,
  SkillCandidate,
  SkillKind,
  SkillSignals,
  SourceKey,
} from "./types";

/**
 * Patterns that mark a candidate as an actual *skill* (a skill, subagent,
 * slash-command set, or skill collection) rather than a generic tool/server.
 */
const SKILL_PATTERNS: RegExp[] = [
  /agent[- ]?skills?/,
  /\bsub[- ]?agents?\b/,
  /claude[- ]?skills?/,
  /slash[- ]?commands?/,
  /\.claude\b/,
  /awesome[- ]claude/,
  /\bskills?\b/,
];

/**
 * Classify a candidate by what it *is*, not which source surfaced it. A GitHub
 * repo can be a "skill"; an npm-distributed tool is a "package". Falls back to
 * "repo" (MCP servers, general tooling).
 */
export function classifyKind(c: SkillCandidate): SkillKind {
  const text = [c.name, c.description, c.tags.join(" ")].join(" ").toLowerCase();
  if (SKILL_PATTERNS.some((re) => re.test(text))) return "skill";
  const downloads = c.signals.weeklyDownloads ?? 0;
  if (downloads > 0 || /npmjs\.com/.test(c.url) || c.key.startsWith("npm:")) {
    return "package";
  }
  return "repo";
}

/**
 * Per-signal weights. Each signal is normalized to 0–1 (log-scaled) across the
 * candidate set, multiplied by its weight, and summed into a raw composite.
 * Signals are grouped into the three source buckets shown in the UI.
 */
const WEIGHTS = {
  stars: 0.4,
  recency: 0.12,
  forks: 0.06,
  weeklyDownloads: 0.25,
  hnPoints: 0.1,
  mentions: 0.07,
} as const;

const SIGNAL_SOURCE: Record<keyof typeof WEIGHTS, SourceKey> = {
  stars: "github",
  recency: "github",
  forks: "github",
  weeklyDownloads: "npm",
  hnPoints: "community",
  mentions: "community",
};

const EMPTY_SIGNALS: SkillSignals = {
  stars: 0,
  forks: 0,
  daysSinceUpdate: 365,
  weeklyDownloads: 0,
  hnPoints: 0,
  mentions: 0,
};

/** Merge candidates that resolve to the same canonical key. */
export function mergeCandidates(candidates: SkillCandidate[]): SkillCandidate[] {
  const byKey = new Map<string, SkillCandidate>();

  for (const c of candidates) {
    const existing = byKey.get(c.key);
    if (!existing) {
      byKey.set(c.key, {
        ...c,
        tags: [...new Set(c.tags)],
        signals: { ...c.signals },
      });
      continue;
    }

    // Prefer the richer description and the more complete metadata.
    if (c.description.length > existing.description.length) {
      existing.description = c.description;
    }
    existing.owner = existing.owner ?? c.owner;
    existing.tags = [...new Set([...existing.tags, ...c.tags])];

    const s = existing.signals;
    const n = c.signals;
    s.stars = Math.max(s.stars ?? 0, n.stars ?? 0);
    s.forks = Math.max(s.forks ?? 0, n.forks ?? 0);
    s.weeklyDownloads = Math.max(s.weeklyDownloads ?? 0, n.weeklyDownloads ?? 0);
    s.hnPoints = (s.hnPoints ?? 0) + (n.hnPoints ?? 0);
    s.mentions = (s.mentions ?? 0) + (n.mentions ?? 0);
    if (n.daysSinceUpdate != null) {
      s.daysSinceUpdate = Math.min(
        s.daysSinceUpdate ?? Infinity,
        n.daysSinceUpdate,
      );
    }
  }

  return [...byKey.values()];
}

/** Convert a freshness measurement into a 0–1 "recency" signal. */
function recencyValue(daysSinceUpdate: number): number {
  const capped = Math.min(Math.max(daysSinceUpdate, 0), 365);
  return 1 - capped / 365;
}

/** Log-scaled normalizer so a few mega-repos don't flatten everything else. */
function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.log1p(Math.max(value, 0)) / Math.log1p(max);
}

/**
 * Score and rank merged candidates. Pure: same input → same output, no I/O.
 * `previousRanks` maps key → last snapshot's rank for movement arrows.
 */
export function rankSkills(
  candidates: SkillCandidate[],
  previousRanks: Map<string, number> = new Map(),
): RankedSkill[] {
  const merged = mergeCandidates(candidates).map((c) => ({
    ...c,
    signals: { ...EMPTY_SIGNALS, ...c.signals },
  }));

  if (merged.length === 0) return [];

  // Build the per-signal value table (recency derived from daysSinceUpdate).
  const signalKeys = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];
  const values = merged.map((c) => ({
    stars: c.signals.stars,
    recency: recencyValue(c.signals.daysSinceUpdate),
    forks: c.signals.forks,
    weeklyDownloads: c.signals.weeklyDownloads,
    hnPoints: c.signals.hnPoints,
    mentions: c.signals.mentions,
  }));

  const maxima = {} as Record<keyof typeof WEIGHTS, number>;
  for (const k of signalKeys) {
    maxima[k] = Math.max(...values.map((v) => v[k]), 0);
  }

  // Raw weighted composite + per-source contribution for each candidate.
  const scored = merged.map((c, i) => {
    const v = values[i];
    const contribution: Record<SourceKey, number> = {
      github: 0,
      npm: 0,
      community: 0,
    };
    let composite = 0;
    for (const k of signalKeys) {
      const w = WEIGHTS[k] * normalize(v[k], maxima[k]);
      composite += w;
      contribution[SIGNAL_SOURCE[k]] += w;
    }
    return { c, composite, contribution };
  });

  const maxComposite = Math.max(...scored.map((s) => s.composite), 1e-9);

  const ranked = scored
    .map(({ c, composite, contribution }) => {
      const total = contribution.github + contribution.npm + contribution.community;
      const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
      return {
        skill: c,
        score: Math.round((composite / maxComposite) * 100),
        breakdown: {
          github: pct(contribution.github),
          npm: pct(contribution.npm),
          community: pct(contribution.community),
        } as Record<SourceKey, number>,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.skill.signals.stars - a.skill.signals.stars ||
        a.skill.name.localeCompare(b.skill.name),
    );

  return ranked.map(({ skill, score, breakdown }, idx) => {
    const rank = idx + 1;
    const prev = previousRanks.get(skill.key);
    return {
      key: skill.key,
      rank,
      delta: prev == null ? null : prev - rank,
      isNew: previousRanks.size > 0 && prev == null,
      name: skill.name,
      owner: skill.owner,
      description: skill.description,
      url: skill.url,
      kind: classifyKind(skill),
      tags: skill.tags.slice(0, 6),
      signals: skill.signals as SkillSignals,
      score,
      breakdown,
    };
  });
}
