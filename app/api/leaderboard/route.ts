import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(searchParams.get("limit") || "10")

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, points")
      .order("points", { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({ leaderboard: data })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}

