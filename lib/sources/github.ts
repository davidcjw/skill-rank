import type { SkillCandidate } from "../types";

const SEARCH = "https://api.github.com/search/repositories";

/**
 * Queries chosen to surface Claude Code / AI-agent *skills* specifically —
 * skills, subagents, MCP servers, and curated skill collections — rather than
 * every repo that merely mentions an LLM.
 */
const QUERIES = [
  "topic:claude-code stars:>5",
  "topic:claude-skill",
  "topic:agent-skills",
  // Match only name/description (not readme) — README matches dragged in
  // general AI tools that merely mention Claude.
  '"claude skill" in:name,description stars:>3',
  "topic:mcp-server stars:>15",
  '"claude code" subagent in:name,description stars:>3',
];

interface GhRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  topics?: string[];
  archived: boolean;
  fork: boolean;
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 365;
  // Use the fetched-at moment implicitly via Date — acceptable for a daily job.
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "skill-rank",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function runQuery(q: string): Promise<SkillCandidate[]> {
  const url = `${SEARCH}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=25`;
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 86_400, tags: ["skills"] },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { items?: GhRepo[] };
  const items = data.items ?? [];

  return items
    .filter((r) => !r.archived && !r.fork)
    .map((r) => ({
      key: `gh:${r.full_name.toLowerCase()}`,
      name: r.name,
      owner: r.owner?.login,
      description: r.description ?? "",
      url: r.html_url,
      kind: "repo" as const,
      tags: r.topics ?? [],
      signals: {
        stars: r.stargazers_count,
        forks: r.forks_count,
        daysSinceUpdate: daysSince(r.pushed_at),
      },
    }));
}

/** Gather repo candidates from GitHub. Resilient: returns [] on any failure. */
export async function fetchGithubCandidates(): Promise<SkillCandidate[]> {
  try {
    const results = await Promise.allSettled(QUERIES.map(runQuery));
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  } catch {
    return [];
  }
}
