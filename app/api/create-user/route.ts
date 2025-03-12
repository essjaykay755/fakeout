import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { userId, username, email, points, articleId } = await request.json();

    if (!userId || !username || !email) {
      return NextResponse.json(
        { error: "User ID, username, and email are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingUser) {
      // User already exists, update instead
      const { data: userData, error: getUserError } = await supabase
        .from("users")
        .select("points, seen_articles")
        .eq("id", userId)
        .single();

      if (getUserError) {
        throw getUserError;
      }

      const newPoints = (userData?.points || 0) + (points || 0);
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
        throw updateError;
      }
    } else {
      // Create new user
      const { error: createError } = await supabase.from("users").insert({
        id: userId,
        username,
        email,
        points: points || 0,
        seen_articles: articleId ? [articleId] : [],
      });

      if (createError) {
        throw createError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return NextResponse.json(
      { error: "Failed to create/update user" },
      { status: 500 }
    );
  }
}
