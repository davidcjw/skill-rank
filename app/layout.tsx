import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const SITE = "https://skill-rank.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "SkillRank — Top Claude & AI Agent Skills, Ranked Daily",
  description:
    "A live leaderboard of the most popular Claude Code and AI-agent skills, ranked from GitHub, npm, and Hacker News signals. Re-ranked every 24 hours.",
  keywords: [
    "Claude Code skills",
    "AI agent skills",
    "MCP servers",
    "leaderboard",
    "Anthropic",
  ],
  openGraph: {
    title: "SkillRank — Top Claude & AI Agent Skills",
    description:
      "The most popular Claude & AI-agent skills across the web, re-ranked every 24 hours.",
    url: SITE,
    siteName: "SkillRank",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillRank — Top Claude & AI Agent Skills",
    description: "The most popular Claude & AI-agent skills, re-ranked daily.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${firaCode.variable} ${firaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
