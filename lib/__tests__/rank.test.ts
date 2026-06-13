import { describe, expect, it } from "vitest";
import { classifyKind, mergeCandidates, rankSkills } from "../rank";
import type { SkillCandidate } from "../types";

function candidate(over: Partial<SkillCandidate> & { key: string }): SkillCandidate {
  return {
    name: over.key,
    description: "",
    url: `https://example.com/${over.key}`,
    kind: "repo",
    tags: [],
    signals: {},
    ...over,
  };
}

describe("mergeCandidates", () => {
  it("merges duplicate keys, maxing stars and summing community signals", () => {
    const merged = mergeCandidates([
      candidate({ key: "gh:a/b", signals: { stars: 100, hnPoints: 10, mentions: 1 } }),
      candidate({ key: "gh:a/b", signals: { stars: 250, hnPoints: 30, mentions: 2 } }),
      candidate({ key: "gh:c/d", signals: { stars: 5 } }),
    ]);

    expect(merged).toHaveLength(2);
    const ab = merged.find((m) => m.key === "gh:a/b")!;
    expect(ab.signals.stars).toBe(250); // max, not sum
    expect(ab.signals.hnPoints).toBe(40); // summed buzz
    expect(ab.signals.mentions).toBe(3);
  });

  it("keeps the richer description and unions tags", () => {
    const [m] = mergeCandidates([
      candidate({ key: "k", description: "short", tags: ["a"] }),
      candidate({ key: "k", description: "a much longer description", tags: ["b"] }),
    ]);
    expect(m.description).toBe("a much longer description");
    expect(m.tags.sort()).toEqual(["a", "b"]);
  });
});

describe("classifyKind", () => {
  it("classifies by content, not by source", () => {
    // A GitHub repo that is actually a skill collection → "skill".
    expect(
      classifyKind(candidate({ key: "gh:anthropics/skills", name: "skills" })),
    ).toBe("skill");
    expect(
      classifyKind(
        candidate({ key: "gh:a/b", description: "subagents for Claude Code" }),
      ),
    ).toBe("skill");
    // npm-distributed tool with downloads, no skill wording → "package".
    expect(
      classifyKind(
        candidate({ key: "gh:c/d", name: "cc-switch", signals: { weeklyDownloads: 5000 } }),
      ),
    ).toBe("package");
    // Generic MCP server repo → "repo".
    expect(
      classifyKind(
        candidate({ key: "gh:e/f", name: "servers", description: "MCP servers", tags: ["mcp"] }),
      ),
    ).toBe("repo");
  });

  it("populates all three kinds across a realistic set", () => {
    const ranked = rankSkills([
      candidate({ key: "gh:anthropics/skills", name: "skills", signals: { stars: 4000 } }),
      candidate({ key: "gh:x/server", name: "server", description: "MCP server", signals: { stars: 9000 } }),
      candidate({ key: "gh:y/tool", name: "tool", signals: { stars: 100, weeklyDownloads: 8000 } }),
    ]);
    const kinds = new Set(ranked.map((r) => r.kind));
    expect(kinds.has("skill")).toBe(true);
    expect(kinds.has("repo")).toBe(true);
    expect(kinds.has("package")).toBe(true);
  });
});

describe("rankSkills", () => {
  it("returns [] for no candidates", () => {
    expect(rankSkills([])).toEqual([]);
  });

  it("orders by composite score and normalizes the top to 100", () => {
    const ranked = rankSkills([
      candidate({ key: "big", signals: { stars: 50000, weeklyDownloads: 90000 } }),
      candidate({ key: "mid", signals: { stars: 800 } }),
      candidate({ key: "small", signals: { stars: 10 } }),
    ]);

    expect(ranked.map((r) => r.key)).toEqual(["big", "mid", "small"]);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBe(100);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("computes movement and NEW flags against previous ranks", () => {
    const prev = new Map([
      ["big", 2],
      ["mid", 1],
    ]);
    const ranked = rankSkills(
      [
        candidate({ key: "big", signals: { stars: 50000 } }),
        candidate({ key: "mid", signals: { stars: 800 } }),
        candidate({ key: "fresh", signals: { stars: 5 } }),
      ],
      prev,
    );

    const byKey = Object.fromEntries(ranked.map((r) => [r.key, r]));
    expect(byKey.big.delta).toBe(1); // 2 → 1, climbed one
    expect(byKey.mid.delta).toBe(-1); // 1 → 2, dropped one
    expect(byKey.fresh.isNew).toBe(true);
    expect(byKey.fresh.delta).toBeNull();
  });

  it("attributes a stars-only skill entirely to GitHub", () => {
    const [only] = rankSkills([candidate({ key: "x", signals: { stars: 100 } })]);
    expect(only.breakdown.github).toBe(100);
    expect(only.breakdown.npm).toBe(0);
    expect(only.breakdown.community).toBe(0);
  });

  it("splits the breakdown across sources for a multi-signal skill", () => {
    const [s] = rankSkills([
      candidate({
        key: "multi",
        signals: { stars: 1000, weeklyDownloads: 5000, hnPoints: 200 },
      }),
    ]);
    const sum = s.breakdown.github + s.breakdown.npm + s.breakdown.community;
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
    expect(s.breakdown.npm).toBeGreaterThan(0);
    expect(s.breakdown.community).toBeGreaterThan(0);
  });
});
