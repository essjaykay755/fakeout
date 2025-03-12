import { NextResponse } from "next/server"

// This route handler fetches real news articles from NewsAPI
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || "general"
    const limit = Number.parseInt(searchParams.get("limit") || "5")

    // NewsAPI key should be stored in environment variables
    const apiKey = process.env.NEWSAPI_KEY

    if (!apiKey) {
      throw new Error("NewsAPI key is not configured")
    }

    // Fetch articles from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=${limit}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      },
    )

    const data = await response.json()

    if (data.status !== "ok") {
      throw new Error(`NewsAPI error: ${data.message || "Unknown error"}`)
    }

    // Process and truncate articles
    const processedArticles = data.articles
      .filter((article: any) => article.title && article.description)
      .map((article: any) => {
        // Truncate content to 3-4 sentences
        const content = truncateToSentences(article.description + " " + (article.content || ""), 4)

        return {
          title: article.title,
          content,
          image_url: article.urlToImage,
          is_real: true,
          category,
        }
      })

    // Store in Supabase (would be implemented in a real application)

    return NextResponse.json({ articles: processedArticles })
  } catch (error) {
    console.error("Error fetching real news:", error)
    return NextResponse.json({ error: "Failed to fetch real news" }, { status: 500 })
  }
}

// Helper function to truncate text to a specific number of sentences
function truncateToSentences(text: string, maxSentences: number): string {
  const sentenceRegex = /[.!?]+\s+/g
  const sentences = text.split(sentenceRegex)

  if (sentences.length <= maxSentences) {
    return text
  }

  let result = ""
  let count = 0

  for (let i = 0; i < sentences.length && count < maxSentences; i++) {
    const sentence = sentences[i]
    if (sentence.trim()) {
      result += sentence + ". "
      count++
    }
  }

  return result.trim()
}

