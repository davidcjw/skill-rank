"use client";

import { useMemo, useState } from "react";
import type { RankedSkill } from "@/lib/types";
import { SkillRow } from "./SkillRow";

type Filter = "all" | "skill" | "tool";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "skill", label: "Skills" },
  { key: "tool", label: "Tools" },
];

export function Leaderboard({ skills }: { skills: RankedSkill[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      // "Skills" = skill collections/subagents; "Tools" = repos, servers, packages.
      if (filter === "skill" && s.kind !== "skill") return false;
      if (filter === "tool" && s.kind === "skill") return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.owner ?? "").toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [skills, query, filter]);

  return (
    <section className="mx-auto max-w-5xl px-2 pb-24 sm:px-5">
      {/* Controls */}
      <div className="sticky top-0 z-10 -mx-2 mb-1 flex flex-col gap-3 border-b border-border bg-background/80 px-2 py-4 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:px-0">
        <div className="relative w-full sm:max-w-xs">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted"
          >
            /
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search skills, owners, tags…"
            aria-label="Search skills"
            className="w-full rounded-md border border-border bg-surface px-7 py-2 font-mono text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter by kind"
          className="flex items-center gap-1 font-mono text-xs"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`cursor-pointer rounded-md border px-3 py-1.5 transition-colors ${
                  active
                    ? "border-accent/50 bg-accent-dim text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column header */}
      <div className="hidden grid-cols-[3.5rem_1fr_13rem] gap-4 px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:grid">
        <span>Rank</span>
        <span>Skill</span>
        <span className="text-right">Score · sources</span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center font-mono text-sm text-muted">
          <p>
            {query.trim()
              ? `No skills match “${query}”.`
              : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? ""} in today's ranking.`}
          </p>
          {(query.trim() || filter !== "all") && (
            <button
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              clear filters
            </button>
          )}
        </div>
      ) : (
        <div role="list">
          {visible.map((skill, i) => (
            <SkillRow key={skill.key} skill={skill} index={i} />
          ))}
        </div>
      )}

      <p className="mt-6 px-5 font-mono text-[11px] leading-relaxed text-muted">
        Showing {visible.length} of {skills.length}. Score is a 0–100 composite
        of GitHub stars &amp; recency, npm weekly installs, and Hacker News buzz,
        log-scaled so a few giants don&apos;t flatten the field. The coloured bar
        shows each skill&apos;s source mix.
      </p>
    </section>
  );
}
