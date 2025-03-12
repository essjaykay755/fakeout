import { NextResponse } from "next/server";
import Parser from "rss-parser";

export async function GET(request: Request) {
  try {
    console.log("Simple RSS test endpoint called");

    // Initialize the parser with minimal configuration
    const parser = new Parser();

    // Use The Verge as a test feed (known to work from our previous test)
    const feedUrl = "https://www.theverge.com/rss/index.xml";

    console.log(`Attempting to fetch from ${feedUrl}`);

    // Fetch the RSS feed
    const feed = await parser.parseURL(feedUrl);

    console.log(`Successfully fetched ${feed.items?.length || 0} items`);

    // Return just the first item with minimal processing
    const firstItem = feed.items?.[0];

    if (!firstItem) {
      return NextResponse.json({
        success: false,
        message: "No items found in feed",
      });
    }

    return NextResponse.json({
      success: true,
      item: {
        title: firstItem.title,
        link: firstItem.link,
        pubDate: firstItem.pubDate,
        contentSnippet: firstItem.contentSnippet?.slice(0, 200),
      },
    });
  } catch (error) {
    console.error("Error in simple RSS test:", error);

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
