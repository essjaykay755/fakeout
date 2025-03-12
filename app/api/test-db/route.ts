import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  try {
    console.log("Test database endpoint called");

    // Test the database connection by getting the count
    const { count, error: countError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking article count:", countError);
      return NextResponse.json(
        {
          success: false,
          error: "Database count error",
          details: countError,
        },
        { status: 500 }
      );
    }

    // Try to insert a test article
    const testArticle = {
      article_id: uuidv4(),
      title: "Test Article - Please Delete",
      content:
        "This is a test article to verify database connectivity. It can be safely deleted.",
      image_url:
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bmV3c3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
      source: "Test Source",
      category: "test",
      is_real: true,
      reason: null,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("news_articles")
      .insert(testArticle);

    if (insertError) {
      console.error("Error inserting test article:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Database insert error",
          details: insertError,
        },
        { status: 500 }
      );
    }

    // If we got here, both operations succeeded
    return NextResponse.json({
      success: true,
      message: "Database connection and operations successful",
      count: count,
      testArticleId: testArticle.article_id,
    });
  } catch (error) {
    console.error("Error in database test:", error);

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
