import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Reset seen articles to empty to allow user to see articles again
    const { error: updateError } = await supabase
      .from("users")
      .update({ seen_articles: [] })
      .eq("id", userId);

    if (updateError) {
      console.error("Error resetting seen articles:", updateError);
      return NextResponse.json(
        { error: `Failed to reset seen articles: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Now let's verify the database state
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("seen_articles")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated user data:", fetchError);
    } else {
      console.log("Updated seen_articles:", userData.seen_articles);
    }

    return NextResponse.json({
      message: "Successfully reset seen articles",
      seenArticles: userData?.seen_articles || [],
    });
  } catch (error) {
    console.error("Error in reset-seen-articles API:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
