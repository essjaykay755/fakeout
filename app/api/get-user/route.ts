import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Try to find the user in the database
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    // If there's an error but it's just "no rows returned", return null data but no error
    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return NextResponse.json({ data: null, error: null });
      }
      throw error;
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("Error getting user:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
