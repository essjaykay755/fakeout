import { NextResponse } from "next/server";
import Parser from "rss-parser";

// Simple endpoint to test RSS feed fetching
export async function GET(request: Request) {
  try {
    // Initialize the parser
    const parser = new Parser({
      customFields: {
        item: [
          "media:content",
          "content",
          "content:encoded",
          "enclosure",
          "description",
          "summary",
        ],
      },
    });

    // Try to fetch from a reliable RSS feed
    const feed = await parser.parseURL(
      "https://www.theverge.com/rss/index.xml"
    );

    // Return the first 3 items
    const items = feed.items.slice(0, 3).map((item) => ({
      title: item.title,
      link: item.link,
      content: item.content || item.contentSnippet || "",
    }));

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error("Error testing RSS feed:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "RSS feed test failed",
          message: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "RSS feed test failed",
      },
      { status: 500 }
    );
  }
}
