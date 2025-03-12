import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// This route handler fetches a mix of real and fake articles
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") || "10");
  const userId = searchParams.get("userId");
  const forceRandom = searchParams.get("forceRandom") === "true";

  try {
    console.log("Fetching articles for userId:", userId);

    // Get user's seen articles if a userId is provided
    let seenArticles: string[] = [];
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("seen_articles")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
      } else {
        seenArticles = userData?.seen_articles || [];
        console.log(`User has seen ${seenArticles.length} articles`);
      }
    }

    // First, get the total count of articles to better handle randomization
    const { count, error: countError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    if (!count || count === 0) {
      return NextResponse.json({ articles: [] });
    }

    console.log(`Total articles in database: ${count}`);

    // Step 1: Fetch newest articles first - prioritize recency
    let query = supabase.from("news_articles").select("*");

    // Filter out seen articles if we have user data and not forcing random
    if (userId && seenArticles.length > 0 && !forceRandom) {
      query = query.not("article_id", "in", `(${seenArticles.join(",")})`);
    }

    // Get a good mix of real and fake news
    const { data: recentArticles, error: recentError } = await query
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    if (recentError) {
      throw recentError;
    }

    // Step 2: If we need more articles, fetch some with diverse categories
    let finalArticles = recentArticles || [];
    let categories: Record<string, number> = {};

    // Track which categories we already have
    finalArticles.forEach((article) => {
      if (article.category) {
        categories[article.category] = (categories[article.category] || 0) + 1;
      }
    });

    if (finalArticles.length < limit) {
      console.log(
        "Not enough unseen articles, fetching with category diversity"
      );

      // Find categories we don't have much of
      const underrepresentedCategories = Object.entries(categories)
        .filter(([_, count]) => count < 2)
        .map(([category]) => category);

      // If we have categories to target, get more from those categories
      if (underrepresentedCategories.length > 0) {
        const { data: categoryArticles, error: catError } = await supabase
          .from("news_articles")
          .select("*")
          .in("category", underrepresentedCategories)
          .not(
            "article_id",
            "in",
            finalArticles.map((a) => a.article_id)
          )
          .limit(limit - finalArticles.length);

        if (!catError && categoryArticles && categoryArticles.length > 0) {
          finalArticles = [...finalArticles, ...categoryArticles];
        }
      }
    }

    // Step 3: If we still need more articles, fetch completely random ones
    if (finalArticles.length < limit) {
      console.log("Still need more articles, fetching completely random ones");

      const { data: randomArticles, error: randError } = await supabase
        .from("news_articles")
        .select("*")
        .not(
          "article_id",
          "in",
          finalArticles.map((a) => a.article_id)
        )
        .order("created_at", { ascending: false })
        .limit(limit - finalArticles.length);

      if (!randError && randomArticles) {
        finalArticles = [...finalArticles, ...randomArticles];
      }
    }

    // Step 4: Deduplicate articles based on titles to avoid nearly-duplicate content
    const uniqueTitles = new Set();
    const deduplicatedArticles = finalArticles.filter((article) => {
      // Create a normalized version of the title for comparison
      const normalizedTitle = article.title.toLowerCase().trim();

      // If we've seen this title before, filter it out
      if (uniqueTitles.has(normalizedTitle)) {
        return false;
      }

      // Otherwise add it and keep the article
      uniqueTitles.add(normalizedTitle);
      return true;
    });

    // Step 5: Balance real and fake news
    const realArticles = deduplicatedArticles.filter((a) => a.is_real);
    const fakeArticles = deduplicatedArticles.filter((a) => !a.is_real);

    // Aim for approximately 50% real, 50% fake
    const targetReal = Math.min(Math.ceil(limit / 2), realArticles.length);
    const targetFake = Math.min(limit - targetReal, fakeArticles.length);

    let selectedRealArticles = realArticles.slice(0, targetReal);
    let selectedFakeArticles = fakeArticles.slice(0, targetFake);

    // If we still don't have enough articles after balancing, use what we have
    let balancedArticles = [...selectedRealArticles, ...selectedFakeArticles];

    // If we still don't have enough, add back some of the filtered articles
    if (
      balancedArticles.length < Math.min(limit, deduplicatedArticles.length)
    ) {
      const remainingReal = realArticles.slice(targetReal);
      const remainingFake = fakeArticles.slice(targetFake);
      const remaining = [...remainingReal, ...remainingFake];
      balancedArticles = [
        ...balancedArticles,
        ...remaining.slice(0, limit - balancedArticles.length),
      ];
    }

    // Better shuffling algorithm (Fisher-Yates shuffle)
    for (let i = balancedArticles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balancedArticles[i], balancedArticles[j]] = [
        balancedArticles[j],
        balancedArticles[i],
      ];
    }

    console.log(
      `Balanced articles: ${balancedArticles.length} real, ${
        balancedArticles.filter((a) => !a.is_real).length
      } fake`
    );

    // Limit to the requested number
    finalArticles = balancedArticles.slice(0, limit);

    // Ensure we don't have consecutive articles of the same type (real or fake)
    // This is important for the gameplay experience
    for (let i = 1; i < finalArticles.length; i++) {
      if (finalArticles[i].is_real === finalArticles[i - 1].is_real) {
        // Find an article of the opposite type to swap with
        const desiredType = !finalArticles[i].is_real;
        let swapIndex = -1;

        // Look ahead for an article of the opposite type
        for (let j = i + 1; j < finalArticles.length; j++) {
          if (finalArticles[j].is_real === desiredType) {
            swapIndex = j;
            break;
          }
        }

        // If we found one, swap them
        if (swapIndex !== -1) {
          const temp = finalArticles[i];
          finalArticles[i] = finalArticles[swapIndex];
          finalArticles[swapIndex] = temp;
        }
      }
    }

    console.log(`Returning ${finalArticles.length} articles to client`);

    // If we STILL don't have enough articles, trigger article generation
    if (finalArticles.length < limit / 2) {
      try {
        console.log("Not enough articles, triggering article generation...");
        await fetch(
          `${new URL(request.url).origin}/api/generate-more-articles`,
          {
            method: "GET",
          }
        );
        // Note: We won't wait for the result here, as it takes time
        // The new articles will be available on next request
      } catch (genError) {
        console.error("Error triggering article generation:", genError);
      }
    }

    // Pre-warm the cache by identifying articles that might need fixing
    // This is a non-blocking operation to avoid slowing down the response
    try {
      // Sample a small number of articles to check and potentially fix
      // Just run this for a few articles to avoid overwhelming the API
      const articlesToCheck = finalArticles
        .filter((article) => {
          // Simple heuristic to identify potential mismatches
          const content = article.content || "";
          return (
            // Check for common patterns that indicate mismatches
            (article.title.includes("BREAKING") &&
              !content.includes("revolutionary")) ||
            (article.title.includes("Leads to Discovery") &&
              !content.includes("aliens")) ||
            (article.title.includes("Truth") &&
              article.title.includes("Know")) ||
            // For fake articles with certain types
            (!article.is_real &&
              (article.reason === "Satire or Parody" ||
                article.reason === "Misleading Headline"))
          );
        })
        .slice(0, 3); // Only pre-warm for up to 3 articles to limit API calls

      // Fire and forget - don't await the result
      Promise.allSettled(
        articlesToCheck.map((article) =>
          fetch(`${new URL(request.url).origin}/api/fix-article-content`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              article_id: article.article_id,
              title: article.title,
              content: article.content,
              is_real: article.is_real,
              reason: article.reason,
            }),
          })
        )
      )
        .then(() => {
          console.log(
            `Pre-warmed cache for ${articlesToCheck.length} articles`
          );
        })
        .catch((error) => {
          console.error("Error pre-warming article cache:", error);
        });
    } catch (prewarmError) {
      console.error("Error in pre-warm process:", prewarmError);
      // Don't let this error affect the main response
    }

    // Remove source field from articles before returning them
    const articlesWithoutSource = finalArticles.map((article) => {
      const { source, ...articleWithoutSource } = article;
      return articleWithoutSource;
    });

    return NextResponse.json({
      articles: articlesWithoutSource,
      totalArticles: count,
      unseenArticles: count - seenArticles.length,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
