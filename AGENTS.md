# AGENTS.md — SkillRank

Guidance for AI agents working in this repo.

## What this is

A Next.js 16 app that ranks Claude / AI-agent skills by a cross-web popularity score and re-ranks every 24 hours. No database required to run; an optional Supabase table unlocks day-over-day movement arrows.

## Commands

```bash
npm run dev     # local dev server
npm test        # vitest (ranking engine) — run before claiming a feature done
npm run lint    # eslint (next core-web-vitals + ts)
npm run build   # production build; must pass before deploy
```

Always run `npm test` and `npm run lint` before considering a change complete.

## Where things live

- **Scoring logic** is in `lib/rank.ts` and is **pure** (no I/O). All ranking/merge changes go here and must keep `lib/__tests__/rank.test.ts` green. Add a test for any new signal or weight.
- **Each web source** is one file in `lib/sources/` exporting a single `fetch*Candidates()` that **must be resilient** — wrap everything in try/catch and return `[]` on failure. Never let a dead source break the page. Current sources: `github`, `npm`, `hackernews`, `awesomeLists` (extracts `gh:owner/repo` links from curated "awesome-*" READMEs via raw.githubusercontent.com → `mentions` endorsement signal, community bucket). A "buzz/mention" source only adds value if it maps to a canonical `gh:owner/repo` key, since merge is by key.
- **`lib/trending.ts`** (`selectTrending`/`hasTrending`) is a **pure** selector of risers/fallers/new from the ranked board's `delta`/`isNew`. `components/Trending.tsx` renders the strip and returns `null` until movement data exists. Keep the selector tested.
- **Source fetches** must be tagged for cache invalidation: `next: { revalidate: 86_400, tags: ["skills"] }`. The cron route calls `revalidateTag("skills")`.
- **`lib/skills.ts`** is the orchestrator. New sources are wired in here and into `liveSources`. It filters live candidates through `isRelevantSkill` before ranking.
- **`lib/relevance.ts`** is the on-topic gate: an allowlist of Claude/agent terms (`RELEVANCE_PATTERNS`) plus a curated denylist of non-skill repos (`EXCLUDE_KEY_PATTERNS`, e.g. n8n, vendor CLIs). When a general-purpose tool keeps surfacing, add it to the denylist and cover it in `lib/__tests__/relevance.test.ts`.
- **`lib/seed.ts`** is the offline fallback; keep entries real and plausible.
- **UI** lives in `components/`. The board is OLED-dark, Fira Code/Sans, with tabular figures (`.tnum`) on every number. Keep that aesthetic.

## Conventions

- Tailwind v4 with semantic tokens from `app/globals.css` (`bg-surface`, `text-accent`, `border-border`, `text-up`/`text-down`, etc.). Don't hardcode hex in components.
- No emojis as structural icons (a few inline glyphs like ★/▲ in data labels are intentional).
- Adding a popularity signal: extend `SkillSignals` (types.ts) → populate it in a source → add a weight in `WEIGHTS` and a bucket in `SIGNAL_SOURCE` (rank.ts) → add a test.

## Gotchas

- Time-relative UI is client-only (`TimeAgo.tsx`) to avoid SSR clock skew — don't compute relative time during server render.
- The page is ISR (`revalidate = 86_400`); reads inside it must use cached fetches (no `cache: "no-store"`), or the page goes fully dynamic. This rules out auth flows needing a token POST (e.g. Reddit OAuth) inside the render path — a Reddit source was rejected for this reason (and Reddit's public `.json` 403s server requests anyway). Prefer cacheable GET sources.
- After any meaningful change, update this file and `README.md` in the same pass.
