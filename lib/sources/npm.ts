import type { SkillCandidate } from "../types";

const SEARCH = "https://registry.npmjs.org/-/v1/search";
const DOWNLOADS = "https://api.npmjs.org/downloads/point/last-week";

const QUERIES = ["claude skill", "claude agent", "mcp server", "claude code"];

interface NpmObject {
  package: {
    name: string;
    description?: string;
    links?: { repository?: string; npm?: string; homepage?: string };
    publisher?: { username?: string };
    keywords?: string[];
    date?: string;
  };
}

function daysSince(iso?: string): number {
  if (!iso) return 365;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 365;
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

async function weeklyDownloads(pkg: string): Promise<number> {
  try {
    const res = await fetch(`${DOWNLOADS}/${encodeURIComponent(pkg)}`, {
      next: { revalidate: 86_400, tags: ["skills"] },
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { downloads?: number };
    return data.downloads ?? 0;
  } catch {
    return 0;
  }
}

async function runQuery(q: string): Promise<NpmObject[]> {
  const url = `${SEARCH}?text=${encodeURIComponent(q)}&size=20`;
  const res = await fetch(url, {
    next: { revalidate: 86_400, tags: ["skills"] },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { objects?: NpmObject[] };
  return data.objects ?? [];
}

/** Gather package candidates from npm, enriched with weekly downloads. */
export async function fetchNpmCandidates(): Promise<SkillCandidate[]> {
  try {
    const results = await Promise.allSettled(QUERIES.map(runQuery));
    const objects = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );

    // Dedupe by package name before the (rate-limited) downloads lookups.
    const seen = new Map<string, NpmObject>();
    for (const o of objects) {
      if (!seen.has(o.package.name)) seen.set(o.package.name, o);
    }
    const unique = [...seen.values()].slice(0, 40);

    const enriched = await Promise.all(
      unique.map(async (o) => {
        const p = o.package;
        const repo = p.links?.repository;
        return {
          // Prefer the backing repo as the canonical key so npm + GitHub merge.
          key: repo
            ? `gh:${repo
                .replace(/^git\+/, "")
                .replace(/\.git$/, "")
                .replace(/^https?:\/\/github\.com\//i, "")
                .toLowerCase()}`
            : `npm:${p.name.toLowerCase()}`,
          name: p.name,
          owner: p.publisher?.username,
          description: p.description ?? "",
          url: p.links?.npm ?? `https://www.npmjs.com/package/${p.name}`,
          kind: "package" as const,
          tags: p.keywords ?? [],
          signals: {
            weeklyDownloads: await weeklyDownloads(p.name),
            daysSinceUpdate: daysSince(p.date),
          },
        } satisfies SkillCandidate;
      }),
    );

    return enriched;
  } catch {
    return [];
  }
}
