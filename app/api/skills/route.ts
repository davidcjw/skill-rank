import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/skills";

/** Public JSON feed of the current ranking. Revalidates daily. */
export const revalidate = 86_400;

export async function GET() {
  const board = await getLeaderboard();
  return NextResponse.json(board);
}
