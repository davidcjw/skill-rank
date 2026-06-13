import type { SkillCandidate } from "../types";

const SEARCH = "https://hn.algolia.com/api/v1/search";

const QUERIES = ["claude skill", "claude code", "mcp server", "claude agent"];

interface HnHit {
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
}

/** Pull "owner/repo" out of a GitHub URL, if the link points to one. */
function githubSlug(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  const repo = m[2].replace(/\.git$/, "");
  return `${m[1]}/${repo}`.toLowerCase();
}

async function runQuery(q: string): Promise<HnHit[]> {
  const url = `${SEARCH}?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=40`;
  const res = await fetch(url, {
    next: { revalidate: 86_400, tags: ["skills"] },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { hits?: HnHit[] };
  return data.hits ?? [];
}

/**
 * Community buzz from Hacker News. Stories that link to a GitHub repo become
 * candidates keyed by that repo, so HN points reinforce the GitHub signal for
 * skills the community is actually talking about.
 */
export async function fetchHackerNewsCandidates(): Promise<SkillCandidate[]> {
  try {
    const results = await Promise.allSettled(QUERIES.map(runQuery));
    const hits = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    const byRepo = new Map<string, SkillCandidate>();
    for (const h of hits) {
      const slug = githubSlug(h.url);
      if (!slug) continue;
      const key = `gh:${slug}`;
      const points = (h.points ?? 0) + (h.num_comments ?? 0);
      const existing = byRepo.get(key);
      if (existing) {
        existing.signals.hnPoints = (existing.signals.hnPoints ?? 0) + points;
        existing.signals.mentions = (existing.signals.mentions ?? 0) + 1;
        continue;
      }
      const name = slug.split("/")[1];
      byRepo.set(key, {
        key,
        name,
        owner: slug.split("/")[0],
        description: h.title ?? "",
        url: h.url ?? `https://github.com/${slug}`,
        kind: "repo",
        tags: [],
        signals: { hnPoints: points, mentions: 1 },
      });
    }

    return [...byRepo.values()];
  } catch {
    return [];
  }
}
