import { describe, expect, it } from "vitest";
import { isRelevantSkill } from "../relevance";
import type { SkillCandidate } from "../types";

function candidate(over: Partial<SkillCandidate>): SkillCandidate {
  return {
    key: "k",
    name: "",
    description: "",
    url: "https://example.com",
    kind: "repo",
    tags: [],
    signals: {},
    ...over,
  };
}

describe("isRelevantSkill", () => {
  it("keeps obvious Claude / agent-skill projects", () => {
    const keep = [
      candidate({ name: "claude-code", description: "agentic coding tool" }),
      candidate({ name: "skills", owner: "anthropics" }),
      candidate({ name: "servers", tags: ["mcp-server", "mcp"] }),
      candidate({ name: "agents", description: "subagents for Claude Code" }),
      candidate({ description: "An MCP server for Postgres" }),
    ];
    for (const c of keep) expect(isRelevantSkill(c)).toBe(true);
  });

  it("rejects general AI tooling that only mentions AI broadly", () => {
    const drop = [
      candidate({ name: "react", description: "A JavaScript library for UIs" }),
      candidate({
        name: "some-platform",
        description: "Visual workflow builder with native AI capabilities.",
        tags: ["workflow", "automation", "low-code"],
      }),
    ];
    for (const c of drop) expect(isRelevantSkill(c)).toBe(false);
  });

  it("denylists platforms even when they self-tag with mcp / ai-agents", () => {
    const n8n = candidate({
      key: "gh:n8n-io/n8n",
      name: "n8n",
      owner: "n8n-io",
      description: "Workflow automation with native AI capabilities.",
      tags: ["mcp", "ai-agents", "workflow"], // would otherwise pass the gate
    });
    expect(isRelevantSkill(n8n)).toBe(false);
  });

  it("does not match 'mcp' inside unrelated words", () => {
    expect(
      isRelevantSkill(candidate({ name: "mcpherson-utils", description: "" })),
    ).toBe(false);
  });
});
