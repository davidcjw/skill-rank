import type { SkillCandidate } from "./types";

/**
 * Terms that mark a candidate as genuinely part of the Claude / agent-skill
 * ecosystem. Web searches (npm "claude agent", GitHub readme matches, HN
 * stories) drag in general-purpose AI tooling — e.g. workflow platforms whose
 * READMEs merely mention Claude. A candidate must match at least one of these
 * across its name/owner/description/tags/url to be ranked.
 *
 * Short, ambiguous tokens (mcp, ai-agent) use word boundaries; longer phrases
 * match as substrings.
 */
const RELEVANCE_PATTERNS: RegExp[] = [
  /\bclaude\b/,
  /\banthropics?\b/,
  /\bmcp\b/,
  /model[- ]?context[- ]?protocol/,
  /\bsub[- ]?agents?\b/,
  /agent[- ]?skills?/,
  /\bagentic\b/,
  /\bai[- ]agents?\b/,
  /claude[- ]code/,
  /slash[- ]commands?/,
  /\.claude\b/,
];

/**
 * Curated denylist of repos that pass the term gate but aren't *skills*:
 * standalone automation platforms and rival-vendor agent CLIs that self-tag
 * with "mcp"/"ai-agents". Matched against the canonical key (gh:owner/repo).
 * This is a maintained list — add offenders as they surface.
 */
const EXCLUDE_KEY_PATTERNS: RegExp[] = [
  /^gh:n8n-io\//, // workflow automation platform
  /^gh:google-gemini\//, // rival vendor CLI
  /^gh:langgenius\//, // dify
  /^gh:flowiseai\//, // flowise
  /^gh:langflow-ai\//, // langflow
];

/** True if the candidate is on-topic for a Claude / agent-skill leaderboard. */
export function isRelevantSkill(c: SkillCandidate): boolean {
  if (EXCLUDE_KEY_PATTERNS.some((re) => re.test(c.key))) return false;
  const text = [c.name, c.owner ?? "", c.description, c.tags.join(" "), c.url]
    .join(" ")
    .toLowerCase();
  return RELEVANCE_PATTERNS.some((re) => re.test(text));
}
