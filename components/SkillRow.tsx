import type { RankedSkill, SourceKey } from "@/lib/types";
import { compact } from "@/lib/format";

const KIND_LABEL: Record<RankedSkill["kind"], string> = {
  repo: "repo",
  package: "npm",
  skill: "skill",
};

const SOURCE_META: Record<SourceKey, { label: string; className: string }> = {
  github: { label: "GitHub", className: "bg-accent" },
  npm: { label: "npm", className: "bg-sky-400" },
  community: { label: "HN", className: "bg-amber" },
};

function DeltaBadge({ delta, isNew }: { delta: number | null; isNew: boolean }) {
  if (isNew) {
    return (
      <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber">
        NEW
      </span>
    );
  }
  if (delta == null) return <span className="font-mono text-xs text-muted">—</span>;
  if (delta === 0)
    return <span className="font-mono text-xs text-muted">•</span>;
  const up = delta > 0;
  return (
    <span
      className={`tnum font-mono text-xs font-semibold ${up ? "text-up" : "text-down"}`}
      title={`${up ? "up" : "down"} ${Math.abs(delta)} since yesterday`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

function Breakdown({ skill }: { skill: RankedSkill }) {
  const order: SourceKey[] = ["github", "npm", "community"];
  return (
    <div className="w-full">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        {order.map((s) => {
          const pct = skill.breakdown[s];
          if (pct <= 0) return null;
          return (
            <div
              key={s}
              className={SOURCE_META[s].className}
              style={{ width: `${pct}%` }}
              title={`${SOURCE_META[s].label}: ${pct}%`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SkillRow({ skill, index }: { skill: RankedSkill; index: number }) {
  const top = skill.rank <= 3;
  return (
    <a
      href={skill.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
      className="row-in group grid cursor-pointer grid-cols-[2.75rem_1fr_auto] items-center gap-4 border-b border-border px-3 py-4 transition-colors hover:bg-surface/60 sm:grid-cols-[3.5rem_1fr_13rem] sm:px-5"
    >
      {/* Rank + movement */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`tnum font-mono leading-none ${
            top
              ? "text-2xl font-bold text-accent glow-accent"
              : "text-xl font-semibold text-muted"
          }`}
        >
          {skill.rank}
        </span>
        <DeltaBadge delta={skill.delta} isNew={skill.isNew} />
      </div>

      {/* Identity */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-mono text-base font-semibold text-foreground group-hover:text-accent">
            {skill.name}
          </h3>
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
            {KIND_LABEL[skill.kind]}
          </span>
        </div>
        {skill.owner && (
          <p className="font-mono text-xs text-muted">@{skill.owner}</p>
        )}
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted">
          {skill.description || "No description provided."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
          {skill.signals.stars > 0 && (
            <span className="tnum">★ {compact(skill.signals.stars)}</span>
          )}
          {skill.signals.weeklyDownloads > 0 && (
            <span className="tnum">⬇ {compact(skill.signals.weeklyDownloads)}/wk</span>
          )}
          {skill.signals.hnPoints > 0 && (
            <span className="tnum">▲HN {compact(skill.signals.hnPoints)}</span>
          )}
        </div>
      </div>

      {/* Score + breakdown */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-baseline gap-1">
          <span className="tnum font-mono text-2xl font-bold text-foreground">
            {skill.score}
          </span>
          <span className="font-mono text-xs text-muted">/100</span>
        </div>
        <div className="hidden w-full sm:block">
          <Breakdown skill={skill} />
        </div>
      </div>
    </a>
  );
}
