import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import Parser from "rss-parser";

// Helper function to truncate content to a specific number of sentences
function truncateToSentences(text: string, count: number): string {
  if (!text) return "";

  // Match sentences ending with ., !, or ? followed by space or end of string
  const sentences = text.match(/[^.!?]+[.!?](?:\s|$)/g) || [];

  return sentences.slice(0, count).join("").trim();
}

// Helper function to create a fake news version based on real news
async function generateFakeNews(
  title: string,
  content: string,
  category: string
) {
  try {
    // Generate fake news using the Gemini API
    const response = await fetch(
      process.env.GEMINI_API_URL ||
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY || "",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a disinformation expert. Create a realistic fake news article about the same topic as this real news: "${title}". 
                  Make it misleading but believable. Don't make it too extreme or obvious.
                  Make it approximately the same length as this real article: "${content}".
                  Format your response as a JSON object with the structure {"title": "fake title", "content": "fake content", "reason": "Why this is fake news"}.
                  Include the "reason" field to identify what makes this fake news (exaggeration, misinformation, etc.).
                  Don't include any other text in your response than the JSON object.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse the Gemini response to extract the fake news
    try {
      const generatedText = data.candidates[0].content.parts[0].text.trim();
      // Extract JSON object from the response using a regular expression that works across multiple lines
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return {
          title: parsedData.title,
          content: parsedData.content,
          reason: parsedData.reason || "Misinformation",
        };
      } else {
        throw new Error("Failed to parse JSON from Gemini response");
      }
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return {
        title: `Fake: ${title}`,
        content: `This is a fabricated version of the news about ${category}.`,
        reason: "Misinformation",
      };
    }
  } catch (error) {
    console.error("Error generating fake news:", error);
    return {
      title: `Fake: ${title}`,
      content: `This is a fabricated version of the news about ${category}.`,
      reason: "Misinformation",
    };
  }
}

export async function POST(request: Request) {
  try {
    const { feeds } = await request.json();

    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid RSS feeds provided",
        },
        { status: 400 }
      );
    }

    // Set up RSS parser
    const parser = new Parser();
    let realArticles: any[] = [];

    // Process each feed and collect articles
    const feedPromises = feeds.map(
      async (feed: { url: string; category: string }) => {
        try {
          const feedData = await parser.parseURL(feed.url);

          // Process each item in the feed
          return feedData.items
            .slice(0, 5) // Take only the first 5 items from each feed to avoid overwhelming
            .map((item) => {
              // Extract and clean content
              let content =
                item.contentSnippet || item.content || item.summary || "";
              // Remove HTML tags
              content = content.replace(/<[^>]*>/g, " ");
              // Truncate to 3-4 sentences
              content = truncateToSentences(content, 4);

              return {
                title: item.title || "Untitled",
                content,
                link: item.link || "",
                pubDate: item.pubDate || new Date().toISOString(),
                category: feed.category,
              };
            });
        } catch (error) {
          console.error(`Error parsing feed ${feed.url}:`, error);
          return [];
        }
      }
    );

    // Wait for all feed parsing to complete
    const articlesArrays = await Promise.all(feedPromises);
    // Flatten the arrays of articles
    realArticles = articlesArrays
      .flat()
      .filter(
        (article) =>
          article.title && article.content && article.content.length > 50
      );

    // If no articles could be parsed
    if (realArticles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No articles could be parsed from the provided feeds",
        },
        { status: 400 }
      );
    }

    console.log(
      `Successfully parsed ${realArticles.length} real articles from RSS feeds`
    );

    // Prepare real articles for database insertion
    const realArticlesToInsert = realArticles.map((article) => ({
      article_id: uuidv4(),
      title: article.title,
      content: article.content,
      image_url: "https://source.unsplash.com/random/800x600/?news",
      category: article.category,
      is_real: true,
      created_at: new Date().toISOString(),
    }));

    // Generate fake articles based on a subset of real articles
    const articlesToFake = Math.min(realArticles.length, 5); // Generate up to 5 fake articles
    const fakeNewsPromises = realArticles
      .slice(0, articlesToFake)
      .map(async (article) => {
        const fakeNews = await generateFakeNews(
          article.title,
          article.content,
          article.category
        );

        return {
          article_id: uuidv4(),
          title: fakeNews.title,
          content: fakeNews.content,
          image_url: "https://source.unsplash.com/random/800x600/?news",
          category: article.category,
          is_real: false,
          reason: fakeNews.reason,
          created_at: new Date().toISOString(),
        };
      });

    // Wait for all fake news generation to complete
    const fakeArticlesToInsert = await Promise.all(fakeNewsPromises);

    // Insert all articles into the database
    const { error } = await supabase
      .from("news_articles")
      .insert([...realArticlesToInsert, ...fakeArticlesToInsert]);

    if (error) {
      console.error("Error inserting articles into database:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to save articles to database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${
        realArticlesToInsert.length + fakeArticlesToInsert.length
      } articles from RSS feeds`,
      realArticles: realArticlesToInsert.length,
      fakeArticles: fakeArticlesToInsert.length,
    });
  } catch (error) {
    console.error("Error in RSS feed generation:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          message: "Error processing RSS feeds",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
