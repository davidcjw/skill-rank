import type { Leaderboard, SourceKey } from "@/lib/types";
import { NextRefresh } from "./NextRefresh";
import { TimeAgo } from "./TimeAgo";

const SOURCE_LABEL: Record<SourceKey, string> = {
  github: "GitHub",
  npm: "npm",
  community: "Hacker News",
};

export function Hero({ board }: { board: Leaderboard }) {
  const sources: SourceKey[] = ["github", "npm", "community"];

  return (
    <header className="scanlines relative overflow-hidden border-b border-border">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-xs text-muted">
          <span className="relative flex h-2 w-2">
            <span className="pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          live · re-ranked every 24h
        </div>

        <h1 className="font-mono text-4xl font-bold leading-none tracking-tight sm:text-6xl">
          Skill<span className="text-accent glow-accent">Rank</span>
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          The most popular{" "}
          <span className="text-foreground">Claude &amp; AI-agent skills</span>{" "}
          across the web — scored from GitHub stars, npm installs, and Hacker
          News buzz, then re-ranked daily.
        </p>

        <dl className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 font-mono text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Last updated
            </dt>
            <dd className="mt-1 flex items-center gap-2 text-foreground">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
              <TimeAgo iso={board.updatedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Next refresh
            </dt>
            <dd className="mt-1 tnum text-foreground">
              <NextRefresh iso={board.nextUpdateAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Skills tracked
            </dt>
            <dd className="mt-1 tnum text-foreground">{board.skills.length}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">
              Sources
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {sources.map((s) => {
                const on = board.liveSources.includes(s);
                return (
                  <span
                    key={s}
                    className={`rounded border px-1.5 py-0.5 text-xs ${
                      on
                        ? "border-accent/40 bg-accent-dim text-accent"
                        : "border-border text-muted"
                    }`}
                    title={on ? "responding" : "no live data this cycle"}
                  >
                    {SOURCE_LABEL[s]}
                  </span>
                );
              })}
            </dd>
          </div>
        </dl>

        {board.usedFallback && (
          <p className="mt-6 rounded-md border border-amber/30 bg-amber/5 px-3 py-2 font-mono text-xs text-amber">
            ⚠ Live sources were unreachable this cycle — showing a curated
            fallback set. Rankings update once a source responds.
          </p>
        )}
      </div>
    </header>
  );
}
