import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    console.log("Test database schema endpoint called");

    // Get a sample article to see the schema
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .limit(1);

    if (error) {
      console.error("Error fetching sample article:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Database query error",
          details: error,
        },
        { status: 500 }
      );
    }

    // If no articles exist, try to get the schema directly
    if (!data || data.length === 0) {
      // Try to get column information
      const { data: columnData, error: columnError } = await supabase
        .rpc("get_table_columns", { table_name: "news_articles" })
        .select("*");

      if (columnError) {
        console.error("Error fetching column information:", columnError);

        // As a fallback, try to insert with minimal fields
        const testInsert = await supabase
          .from("news_articles")
          .insert({
            id: "test-id",
            title: "Test Article",
          })
          .select();

        return NextResponse.json({
          success: false,
          message: "No articles found and couldn't get schema",
          columnError,
          testInsertResult: testInsert,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Retrieved column information",
        columns: columnData,
      });
    }

    // Return the sample article to see the schema
    return NextResponse.json({
      success: true,
      message: "Retrieved sample article to show schema",
      sampleArticle: data[0],
      schema: Object.keys(data[0]),
    });
  } catch (error) {
    console.error("Error in database schema test:", error);

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
