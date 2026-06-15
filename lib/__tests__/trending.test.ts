import { describe, expect, it } from "vitest";
import { selectTrending, hasTrending } from "../trending";
import type { RankedSkill } from "../types";

function ranked(over: Partial<RankedSkill> & { key: string }): RankedSkill {
  return {
    rank: 1,
    delta: null,
    isNew: false,
    name: over.key,
    description: "",
    url: `https://example.com/${over.key}`,
    kind: "repo",
    tags: [],
    signals: {
      stars: 0,
      forks: 0,
      daysSinceUpdate: 0,
      weeklyDownloads: 0,
      hnPoints: 0,
      mentions: 0,
    },
    score: 0,
    breakdown: { github: 0, npm: 0, community: 0 },
    ...over,
  };
}

describe("selectTrending", () => {
  const board = [
    ranked({ key: "a", rank: 1, delta: 2 }),
    ranked({ key: "b", rank: 2, delta: 9 }), // biggest riser
    ranked({ key: "c", rank: 3, delta: -3 }),
    ranked({ key: "d", rank: 4, delta: -8 }), // biggest faller
    ranked({ key: "e", rank: 5, delta: null, isNew: true }),
    ranked({ key: "f", rank: 6, delta: 0 }), // no movement, ignored
  ];

  it("orders risers by largest gain and fallers by largest fall", () => {
    const t = selectTrending(board);
    expect(t.risers.map((s) => s.key)).toEqual(["b", "a"]);
    expect(t.fallers.map((s) => s.key)).toEqual(["d", "c"]);
    expect(t.newcomers.map((s) => s.key)).toEqual(["e"]);
  });

  it("respects the limit", () => {
    const many = [
      ranked({ key: "r1", delta: 5 }),
      ranked({ key: "r2", delta: 4 }),
      ranked({ key: "r3", delta: 3 }),
      ranked({ key: "r4", delta: 2 }),
    ];
    expect(selectTrending(many, 2).risers.map((s) => s.key)).toEqual(["r1", "r2"]);
  });

  it("never lists a new skill as a riser", () => {
    const t = selectTrending([ranked({ key: "n", delta: 5, isNew: true })]);
    expect(t.risers).toHaveLength(0);
    expect(t.newcomers.map((s) => s.key)).toEqual(["n"]);
  });

  it("hasTrending is false before any movement data exists", () => {
    const fresh = [ranked({ key: "x", delta: null }), ranked({ key: "y", delta: null })];
    expect(hasTrending(selectTrending(fresh))).toBe(false);
  });
});
