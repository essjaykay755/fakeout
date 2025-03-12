import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// This route handler seeds the database with fake and real news articles
export async function POST(request: Request) {
  try {
    const { count = 10 } = await request.json();

    // Categories and fake news types
    const categories = [
      "politics",
      "technology",
      "health",
      "entertainment",
      "science",
      "sports",
      "business",
    ];
    const fakeTypes = [
      "False Claim",
      "Misleading Headline",
      "Out of Context",
      "Satire or Parody",
      "Impersonation",
      "Manipulated Content",
      "Conspiracy Theory",
    ];

    // Generate fake news articles
    const fakeNewsPromises = Array.from({ length: count }).map(async () => {
      const category =
        categories[Math.floor(Math.random() * categories.length)];
      const fakeType = fakeTypes[Math.floor(Math.random() * fakeTypes.length)];

      // Use the improved comprehensive prompt format
      let prompt = `Generate a fake news article about ${category} with the fake news type "${fakeType}". 
Follow these guidelines:
1. The article should be 3-4 complete, coherent sentences with a clear beginning and end
2. Start with a title that makes sense with the content
3. Make sure the article is complete and doesn't end mid-sentence
4. The fake element should be identifiable but not absurdly obvious
5. Include enough details to make it believable but false`;

      // Add specific detailed instructions based on the fake type
      switch (fakeType) {
        case "False Claim":
          prompt +=
            "\nInclude a completely fabricated claim that sounds plausible but is demonstrably untrue. Base it on real-world elements but include a false assertion that could be fact-checked.";
          break;
        case "Misleading Headline":
          prompt +=
            "\nCreate a headline that misrepresents or exaggerates the actual content of the article. The headline should suggest something more dramatic than what the article actually states.";
          break;
        case "Out of Context":
          prompt +=
            "\nTake a real fact or statistic but present it in a misleading context that changes its meaning or implications. Include the fact but frame it in a way that leads to incorrect conclusions.";
          break;
        case "Satire or Parody":
          prompt +=
            "\nWrite it as satire that could be mistaken for real news by someone who doesn't read carefully. Use elements of humor but make it subtle enough that some might believe it.";
          break;
        case "Impersonation":
          prompt +=
            "\nPretend the article is from a reputable source making an outlandish claim. Write as if a respected institution is endorsing something uncharacteristic.";
          break;
        case "Manipulated Content":
          prompt +=
            "\nInclude information that has been altered from its original meaning. Take something real but change key details that completely shift what it means.";
          break;
        case "Conspiracy Theory":
          prompt +=
            "\nInclude unfounded connections between unrelated events. Suggest a hidden plan or conspiracy without evidence, connecting dots that aren't actually related.";
          break;
        default:
          prompt +=
            "\nMake it clearly fake but somewhat believable. Include elements that could fool someone who isn't being critical.";
      }

      // Add a final instruction to ensure proper formatting
      prompt +=
        "\n\nFormat your response as follows:\nTitle: [Your headline here]\n[Body of the article with 3-4 complete sentences]";

      const { text } = await generateText({
        model: google("gemini-1.5-flash"),
        prompt,
        maxTokens: 300,
        temperature: 0.7,
      });

      // Extract title and content
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      let title = lines[0];
      let content = "";

      // Process the content
      if (lines.length > 1) {
        // If title is formatted as "Title: Something", extract the actual title
        if (title.toLowerCase().startsWith("title:")) {
          title = title.substring(6).trim();
        }

        // Join the remaining lines for content
        content = lines.slice(1).join(" ");
      } else {
        // In case of unexpected formatting, make a best effort attempt
        const parts = text.split(".");
        if (parts.length > 1) {
          title = parts[0].trim();
          content = parts.slice(1).join(".").trim();
        } else {
          title = "News Article";
          content = text.trim();
        }
      }

      // Ensure content doesn't end without proper punctuation
      if (
        content &&
        !content.endsWith(".") &&
        !content.endsWith("!") &&
        !content.endsWith("?")
      ) {
        content += ".";
      }

      return {
        title,
        content,
        is_real: false,
        reason: fakeType,
        category,
      };
    });

    // Fetch real news articles
    const realNewsPromises = categories.map(async (category) => {
      const apiKey = process.env.NEWS_API_KEY;

      if (!apiKey) {
        throw new Error("NewsAPI key is not configured");
      }

      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=${Math.ceil(
          count / categories.length
        )}`,
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

      return data.articles
        .filter((article: any) => article.title && article.description)
        .map((article: any) => {
          const content = truncateToSentences(
            article.description + " " + (article.content || ""),
            4
          );

          return {
            title: article.title,
            content,
            image_url: article.urlToImage,
            is_real: true,
            category,
          };
        });
    });

    // Wait for all promises to resolve
    const [fakeNews, ...realNewsArrays] = await Promise.all([
      Promise.all(fakeNewsPromises),
      ...realNewsPromises,
    ]);

    // Flatten real news arrays
    const realNews = realNewsArrays.flat();

    // Insert articles into Supabase
    const { data, error } = await supabase
      .from("news_articles")
      .insert([...fakeNews, ...realNews]);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: fakeNews.length + realNews.length,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
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
