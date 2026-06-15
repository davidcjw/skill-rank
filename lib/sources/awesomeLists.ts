import type { SkillCandidate } from "../types";

/**
 * Curated community "awesome-*" lists. A repo appearing in one of these is a
 * real endorsement, so each inclusion adds a `mentions` signal (community
 * bucket) — reinforcing skills the community has hand-picked. Reliable, no auth:
 * raw.githubusercontent.com is a CDN that always answers.
 */
const LISTS = [
  "hesreallyhim/awesome-claude-code",
  "punkpeye/awesome-mcp-servers",
  "wong2/awesome-mcp-servers",
  "yzfly/Awesome-Claude-Agents",
  "VoltAgent/awesome-claude-code-subagents",
];

const RAW = (repo: string, branch: string) =>
  `https://raw.githubusercontent.com/${repo}/${branch}/README.md`;

// Owner segments that are GitHub features, not real account/repo pairs.
const NON_REPO_OWNERS = new Set([
  "topics",
  "sponsors",
  "orgs",
  "settings",
  "features",
  "about",
  "marketplace",
]);

/** Every distinct "owner/repo" GitHub slug referenced in a markdown blob. */
function githubSlugs(md: string): string[] {
  const slugs = new Set<string>();
  const re = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const owner = m[1].toLowerCase();
    const repo = m[2].replace(/\.git$/, "").toLowerCase();
    if (!repo || NON_REPO_OWNERS.has(owner)) continue;
    slugs.add(`${owner}/${repo}`);
    if (slugs.size >= 250) break; // bound a single huge list
  }
  return [...slugs];
}

/** Fetch one list's README, trying the common default branches. */
async function fetchList(repo: string): Promise<string[]> {
  for (const branch of ["main", "master"]) {
    try {
      const res = await fetch(RAW(repo, branch), {
        next: { revalidate: 86_400, tags: ["skills"] },
      });
      if (res.ok) return githubSlugs(await res.text());
    } catch {
      // try the next branch
    }
  }
  return [];
}

/** Candidates endorsed by curated community lists, keyed by their repo. */
export async function fetchAwesomeListCandidates(): Promise<SkillCandidate[]> {
  try {
    const results = await Promise.allSettled(LISTS.map(fetchList));
    const selfRepos = new Set(LISTS.map((r) => r.toLowerCase()));
    const byRepo = new Map<string, SkillCandidate>();

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const slug of r.value) {
        if (selfRepos.has(slug)) continue; // don't rank the lists themselves
        const key = `gh:${slug}`;
        const existing = byRepo.get(key);
        if (existing) {
          // One more list endorses this repo.
          existing.signals.mentions = (existing.signals.mentions ?? 0) + 1;
          continue;
        }
        const [owner, name] = slug.split("/");
        byRepo.set(key, {
          key,
          name,
          owner,
          description: "",
          url: `https://github.com/${slug}`,
          kind: "repo",
          tags: [],
          signals: { mentions: 1 },
        });
      }
    }

    return [...byRepo.values()];
  } catch {
    return [];
  }
}
