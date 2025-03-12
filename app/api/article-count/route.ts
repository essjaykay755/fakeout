import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    console.log("Article count endpoint called");

    // Get the count of articles
    const { count, error } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error fetching article count:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Database query error",
          details: error,
        },
        { status: 500 }
      );
    }

    // Get the most recent articles
    const { data: recentArticles, error: recentError } = await supabase
      .from("news_articles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) {
      console.error("Error fetching recent articles:", recentError);
    }

    return NextResponse.json({
      success: true,
      count: count,
      recentArticles: recentArticles || [],
    });
  } catch (error) {
    console.error("Error in article count endpoint:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
