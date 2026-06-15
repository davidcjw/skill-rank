import type { RankedSkill } from "@/lib/types";
import { selectTrending, hasTrending } from "@/lib/trending";

type Kind = "up" | "down" | "new";

function Item({ skill, kind }: { skill: RankedSkill; kind: Kind }) {
  return (
    <a
      href={skill.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 py-1"
    >
      <span className="tnum w-6 shrink-0 font-mono text-xs text-muted">
        #{skill.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground group-hover:text-accent">
        {skill.name}
      </span>
      {kind === "new" ? (
        <span className="shrink-0 rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber">
          NEW
        </span>
      ) : (
        <span
          className={`tnum shrink-0 font-mono text-xs font-semibold ${
            kind === "up" ? "text-up" : "text-down"
          }`}
        >
          {kind === "up" ? "▲" : "▼"}
          {Math.abs(skill.delta ?? 0)}
        </span>
      )}
    </a>
  );
}

function Column({
  title,
  titleClass,
  skills,
  kind,
  empty,
}: {
  title: string;
  titleClass: string;
  skills: RankedSkill[];
  kind: Kind;
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <h3
        className={`mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${titleClass}`}
      >
        {title}
      </h3>
      {skills.length === 0 ? (
        <p className="py-1 font-mono text-xs text-muted">{empty}</p>
      ) : (
        skills.map((s) => <Item key={s.key} skill={s} kind={kind} />)
      )}
    </div>
  );
}

/** A compact "what moved today" strip above the board. Renders nothing until
 * there's movement data (i.e. after the first daily snapshot). */
export function Trending({ skills }: { skills: RankedSkill[] }) {
  const t = selectTrending(skills);
  if (!hasTrending(t)) return null;

  return (
    <section
      aria-label="Trending today"
      className="mx-auto max-w-5xl px-2 pb-6 sm:px-5"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Column
          title="▲ Risers today"
          titleClass="text-up"
          skills={t.risers}
          kind="up"
          empty="— quiet today —"
        />
        <Column
          title="▼ Fallers"
          titleClass="text-down"
          skills={t.fallers}
          kind="down"
          empty="— holding steady —"
        />
        <Column
          title="✦ New today"
          titleClass="text-amber"
          skills={t.newcomers}
          kind="new"
          empty="— no new entries —"
        />
      </div>
    </section>
  );
}
