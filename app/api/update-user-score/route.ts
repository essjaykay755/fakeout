import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { userId, pointsToAdd, articleId } = await request.json();

    if (!userId || pointsToAdd === undefined) {
      return NextResponse.json(
        { error: "User ID and points are required" },
        { status: 400 }
      );
    }

    // Try to update via our helper function first
    try {
      const { error } = await supabase.rpc("update_user_after_answer", {
        user_id: userId,
        article_id: articleId,
        points_to_add: pointsToAdd,
      });

      if (!error) {
        return NextResponse.json({ success: true });
      }

      // If RPC failed, we'll try direct update below
      console.log("RPC update failed, trying direct update:", error);
    } catch (rpcError) {
      console.error("RPC error:", rpcError);
    }

    // Get current user data
    const { data: userData, error: getUserError } = await supabase
      .from("users")
      .select("points, seen_articles")
      .eq("id", userId)
      .single();

    if (getUserError) {
      return NextResponse.json(
        { error: "Failed to get user data" },
        { status: 500 }
      );
    }

    // Update user record
    const newPoints = (userData?.points || 0) + pointsToAdd;
    const newSeenArticles = [...(userData?.seen_articles || [])];

    // Add article to seen_articles if not already there and it's a valid ID
    if (articleId && !newSeenArticles.includes(articleId)) {
      newSeenArticles.push(articleId);
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        points: newPoints,
        seen_articles: newSeenArticles,
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user score:", error);
    return NextResponse.json(
      { error: "Failed to update user score" },
      { status: 500 }
    );
  }
}
