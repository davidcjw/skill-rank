import { Hero } from "@/components/Hero";
import { Trending } from "@/components/Trending";
import { Leaderboard } from "@/components/Leaderboard";
import { getLeaderboard } from "@/lib/skills";

/** Re-rank daily: the page is statically cached and revalidated every 24h. */
export const revalidate = 86_400;

export default async function Home() {
  const board = await getLeaderboard();

  return (
    <main>
      <Hero board={board} />
      <Trending skills={board.skills} />
      <Leaderboard skills={board.skills} />
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            SkillRank · an independent leaderboard, not affiliated with Anthropic
          </span>
          <a
            href="/api/skills"
            className="text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            JSON API ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
