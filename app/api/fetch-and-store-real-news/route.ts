import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// This route handler fetches real news articles from NewsAPI and stores them in the database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "general";
    const limit = Number.parseInt(searchParams.get("limit") || "10");

    // NewsAPI key should be stored in environment variables
    const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;

    if (!apiKey) {
      throw new Error("NewsAPI key is not configured");
    }

    // Fetch articles from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=${limit}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      }
    );

    const data = await response.json();

    if (data.status !== "ok") {
      throw new Error(`NewsAPI error: ${data.message || "Unknown error"}`);
    }

    // Process and truncate articles - match database schema
    const processedArticles = data.articles
      .filter((article: any) => article.title && article.description)
      .map((article: any) => {
        // Truncate content to 3-4 sentences
        const content = truncateToSentences(
          article.description + " " + (article.content || ""),
          4
        );

        return {
          article_id: uuidv4(),
          title: article.title,
          content,
          image_url: article.urlToImage,
          is_real: true,
          category,
          created_at: new Date().toISOString(),
          player_views: 0,
        };
      });

    if (processedArticles.length === 0) {
      return NextResponse.json(
        { message: "No valid articles found from NewsAPI" },
        { status: 404 }
      );
    }

    // Store in Supabase
    const { data: insertedData, error } = await supabase
      .from("news_articles")
      .insert(processedArticles);

    if (error) {
      console.error("Error inserting articles into Supabase:", error);
      return NextResponse.json(
        { error: `Failed to store articles in database: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully added ${processedArticles.length} real news articles to the database`,
      articles: processedArticles,
    });
  } catch (error) {
    console.error("Error fetching and storing real news:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch and store real news: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

// Helper function to truncate text to a specific number of sentences
function truncateToSentences(text: string, maxSentences: number): string {
  const sentenceRegex = /[.!?]+\s+/g;
  const sentences = text.split(sentenceRegex);

  if (sentences.length <= maxSentences) {
    return text;
  }

  let result = "";
  let count = 0;

  for (let i = 0; i < sentences.length && count < maxSentences; i++) {
    const sentence = sentences[i];
    if (sentence.trim()) {
      result += sentence + ". ";
      count++;
    }
  }

  return result.trim();
}
