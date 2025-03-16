// This file contains mock implementations of Supabase functions for our app
import { supabase, recordGameSession } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export interface ArticleType {
  id: string;
  title: string;
  content: string;
  author: string;
  publisher: string;
  url: string;
  is_fake: boolean;
  category: string;
  published_at: string;
}

export interface FeedbackType {
  article_id: string;
  is_fake: boolean;
  reason?: string | null;
  explanation?: string;
  message: string;
}

// New interface for submitAnswer response
export interface SubmitAnswerResponse {
  feedback?: FeedbackType;
  sessionId?: string;
  userId?: string;
  articleId?: string;
  isFake: boolean;
  reason?: string | null | undefined;
  isCorrect: boolean;
  error?: string;
  warning?: string;
  message?: string;
  success?: boolean;
  pointsAdded?: number;
  correctAnswer?: boolean;
  correctReason?: string | null | undefined;
}

// Get a game session from the database
export async function getGameSession(userId: string) {
  console.log(`Getting game session for user: ${userId}`);

  try {
    // Check if Supabase is properly initialized
    if (!supabase) {
      console.error("Supabase client is not initialized");
      throw new Error("Database client not available");
    }

    // Test the Supabase connection with a simple query
    try {
      const { count, error: testError } = await supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true });

      if (testError) {
        console.error("Supabase connection test failed:", testError);
        throw new Error(
          `Database connection failed: ${JSON.stringify(testError)}`
        );
      }

      console.log("Supabase connection test passed");
    } catch (testErr) {
      console.error("Exception during Supabase connection test:", testErr);
      throw new Error(`Database connection test exception: ${testErr}`);
    }

    // First check if there are any articles in the database
    const { count: totalCount, error: countError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking article count:", countError);
      throw new Error(
        `Could not check article count: ${JSON.stringify(countError)}`
      );
    }

    if (!totalCount || totalCount === 0) {
      console.error(
        "No articles found in the database. Please add articles in the admin panel."
      );
      throw new Error("No articles in database");
    }

    console.log(`Total articles in database: ${totalCount}`);

    // CRITICAL FIX: For small databases (up to 3 articles), always reset seen articles
    // to ensure all content is shown together in one session
    if (totalCount <= 3) {
      console.log(
        "Small article database detected in getGameSession. Showing all articles without resetting seen status."
      );

      // Get all articles directly and skip filtering
      const { data: allArticles, error: allError } = await supabase
        .from("news_articles")
        .select("*");

      if (allError) {
        console.error("Error fetching all articles:", allError);
        throw new Error("Could not fetch all articles");
      }

      if (!allArticles || allArticles.length === 0) {
        throw new Error("No articles found in database");
      }

      // Get the user's current seen articles
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("seen_articles")
        .eq("id", userId)
        .single();

      // If all articles have been seen, return a message to end the game
      if (
        userData &&
        userData.seen_articles &&
        userData.seen_articles.length >= totalCount
      ) {
        console.log(
          "User has seen all articles in small database. Ending game session."
        );
        return {
          id: uuidv4(), // Generate a session ID
          user_id: userId,
          articles: [], // Empty articles array
          score: 0,
          answers: {},
          message:
            "You've seen all available articles. Please check back later for new content or reset your seen articles!",
        };
      }

      // Use all articles
      const randomArticles = allArticles;

      // Debug: Log what type of articles we got
      const realNewsCount = randomArticles.filter((a) => a.is_real).length;
      const fakeNewsCount = randomArticles.filter((a) => !a.is_real).length;
      console.log(
        `Retrieved ${realNewsCount} real news and ${fakeNewsCount} fake news articles`
      );

      // Convert database articles to ArticleType
      const articles = randomArticles.map((article) => ({
        id: article.article_id,
        title: (article.title || "Untitled Article").replace(/^Fake:\s+/i, ""),
        content: article.content || "",
        author: article.author || "Unknown Author",
        publisher: article.source || "Unknown Publisher",
        url: article.url || "",
        is_fake: !article.is_real,
        category: article.category || "Uncategorized",
        published_at: article.created_at || new Date().toISOString(),
      }));

      console.log(
        `Successfully prepared ${articles.length} articles for the game session`
      );

      // Shuffle the articles to ensure random ordering of real and fake articles
      const shuffledArticles = [...articles].sort(() => Math.random() - 0.5);

      console.log(
        `Articles shuffled: ${shuffledArticles.length} articles in randomized order`
      );

      // Log the distribution of articles after shuffling
      const shuffledRealCount = shuffledArticles.filter(
        (a) => !a.is_fake
      ).length;
      const shuffledFakeCount = shuffledArticles.filter(
        (a) => a.is_fake
      ).length;
      console.log(
        `After shuffling: ${shuffledRealCount} real and ${shuffledFakeCount} fake articles`
      );

      return {
        id: uuidv4(), // Generate a session ID
        user_id: userId,
        articles: shuffledArticles,
        score: 0,
        answers: {},
      };
    }

    // Get the user's seen articles
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("seen_articles")
      .eq("id", userId)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("Error fetching user data:", userError);

      // If there's a user error besides "not found", try to create the user record
      if (userError.code === "PGRST116") {
        try {
          // Try to create a user record if it doesn't exist
          const { error: createError } = await supabase.from("users").insert({
            id: userId,
            username: "Player",
            email: "player@example.com", // This will be updated later
            points: 0,
            seen_articles: [],
          });

          if (createError) {
            console.error("Error creating user record:", createError);
          } else {
            console.log("Created new user record");
          }
        } catch (e) {
          console.error("Exception creating user record:", e);
        }
      }
    }

    const seenArticles = userData?.seen_articles || [];
    console.log(`User has seen ${seenArticles.length} articles:`, seenArticles);

    // Log all available article IDs for debugging
    const { data: allArticleData, error: allArticleError } = await supabase
      .from("news_articles")
      .select("article_id");

    if (allArticleError) {
      console.error("Error fetching all article IDs:", allArticleError);
    } else {
      console.log(
        "All article IDs:",
        allArticleData?.map((a) => a.article_id)
      );
    }

    // Check if the user has seen all articles with better validation
    let hasSeenAllArticles = false;
    if (
      seenArticles &&
      seenArticles.length > 0 &&
      allArticleData &&
      allArticleData.length > 0
    ) {
      // Only consider valid article IDs
      const validSeenArticles = seenArticles.filter(
        (id: string) =>
          typeof id === "string" &&
          id.trim() !== "" &&
          allArticleData.some((a) => a.article_id === id)
      );

      if (validSeenArticles.length > 0) {
        hasSeenAllArticles = validSeenArticles.length >= allArticleData.length;
        console.log(
          `Valid seen articles: ${validSeenArticles.length}, Total articles: ${allArticleData.length}`
        );
        console.log(`Has seen all articles: ${hasSeenAllArticles}`);
      } else {
        console.log(
          "No valid seen articles found, assuming user has not seen all articles"
        );
      }
    }

    // For small article databases, we want to avoid resetting too quickly
    // Only reset when they've seen ALL articles AND there are more than just a few
    if (hasSeenAllArticles && totalCount > 3) {
      console.log(
        "User has seen all available articles. Resetting seen articles list."
      );
      // Reset seen articles to empty to allow user to see articles again
      const { error: updateError } = await supabase
        .from("users")
        .update({ seen_articles: [] })
        .eq("id", userId);

      if (updateError) {
        console.error("Error resetting seen articles:", updateError);
      } else {
        console.log("Successfully reset user's seen articles");
        seenArticles.length = 0; // Clear the local array too
      }
    } else if (hasSeenAllArticles) {
      // If there are only a few articles, we need to handle this case differently
      console.log(
        "User has seen all available articles but we have limited articles. Not resetting."
      );
      // Don't reset seen_articles in this case, return a special message
      return {
        id: uuidv4(), // Generate a session ID
        user_id: userId,
        articles: [], // Empty articles array
        score: 0,
        answers: {},
        message:
          "You've seen all available articles. Please check back later for new content!",
      };
    }

    // Log database situation before query
    console.log(`Looking for articles NOT in: ${JSON.stringify(seenArticles)}`);

    // Fetch random articles from the database that haven't been seen by this user
    let query = supabase.from("news_articles").select("*");

    // Filter out articles the user has already seen - improved filtering logic
    if (seenArticles.length > 0) {
      // Making sure we're using a properly formatted array for the filter
      const formattedSeenArticles = seenArticles.filter(
        (id: string) => id && typeof id === "string" && id.trim() !== ""
      );
      console.log(
        `Formatted seen articles for filtering: ${JSON.stringify(
          formattedSeenArticles
        )}`
      );

      if (formattedSeenArticles.length > 0) {
        query = query.not(
          "article_id",
          "in",
          `(${formattedSeenArticles.join(",")})`
        );
        console.log("Applied filter to exclude seen articles");
      } else {
        console.log(
          "No valid article IDs to filter, fetching any available articles"
        );
      }
    } else {
      console.log("No articles to filter out, fetching any available articles");
    }

    // Make sure we fetch both real and fake news
    // Add randomization to avoid showing articles in the same order
    // Debug: Log the query before execution
    console.log("Looking for articles with query:", query);

    // First, count how many real and fake articles would be returned
    const { count: realCount, error: realCountError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_real", true);

    const { count: fakeCount, error: fakeCountError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_real", false);

    console.log(
      `Potential real articles: ${realCount}, Potential fake articles: ${fakeCount}`
    );

    // Fetch BOTH real and fake news separately to ensure we get both types
    let randomArticles: any[] = [];
    let error = null;

    // Fetch real news
    if (realCount && realCount > 0) {
      const { data: realArticles, error: realError } = await supabase
        .from("news_articles")
        .select("*")
        .eq("is_real", true)
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(5);

      if (realError) {
        console.error("Error fetching real articles:", realError);
        error = realError;
      } else if (realArticles) {
        randomArticles = [...randomArticles, ...realArticles];
        console.log(`Retrieved ${realArticles.length} real news articles`);
      }
    }

    // Fetch fake news
    if (fakeCount && fakeCount > 0) {
      const { data: fakeArticles, error: fakeError } = await supabase
        .from("news_articles")
        .select("*")
        .eq("is_real", false)
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(5);

      if (fakeError) {
        console.error("Error fetching fake articles:", fakeError);
        if (!error) error = fakeError;
      } else if (fakeArticles) {
        randomArticles = [...randomArticles, ...fakeArticles];
        console.log(`Retrieved ${fakeArticles.length} fake news articles`);
      }
    }

    // If we couldn't fetch either type separately, try the original approach
    if (randomArticles.length === 0) {
      console.log("Falling back to combined article query");
      const { data: allArticles, error: queryError } = await supabase
        .from("news_articles")
        .select("*")
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(10);

      if (queryError) {
        error = queryError;
      } else if (allArticles) {
        randomArticles = allArticles;
      }
    }

    // Debug: Log what type of articles we got
    if (randomArticles && randomArticles.length > 0) {
      const realNewsCount = randomArticles.filter((a) => a.is_real).length;
      const fakeNewsCount = randomArticles.filter((a) => !a.is_real).length;
      console.log(
        `Retrieved ${realNewsCount} real news and ${fakeNewsCount} fake news articles`
      );
    }

    if (error) {
      console.error("Error fetching articles:", error);
      throw new Error(`Failed to fetch articles: ${JSON.stringify(error)}`);
    }

    if (!randomArticles || randomArticles.length === 0) {
      console.error("No unseen articles found for the user");

      // If there are no unseen articles but we know there are articles in the database,
      // this likely means they've seen all articles and we need to reset
      if (totalCount > 0) {
        console.log(
          "User has seen all articles. Forcing reset of seen_articles."
        );
        // Reset seen articles to empty to allow user to see articles again
        const { error: updateError } = await supabase
          .from("users")
          .update({ seen_articles: [] })
          .eq("id", userId);

        if (updateError) {
          console.error("Error resetting seen articles:", updateError);
        } else {
          console.log(
            "Successfully reset user's seen articles after finding no unseen articles"
          );

          // Try again to fetch articles now that we've reset
          const { data: resetArticles, error: resetError } = await supabase
            .from("news_articles")
            .select("*")
            .order("article_id", { ascending: false })
            .limit(10);

          if (!resetError && resetArticles && resetArticles.length > 0) {
            // Success! Convert these to the article format
            const articles = resetArticles.map((article) => ({
              id: article.article_id,
              title: (article.title || "Untitled Article").replace(
                /^Fake:\s+/i,
                ""
              ),
              content: article.content || "",
              author: article.author || "Unknown Author",
              publisher: article.source || "Unknown Publisher",
              url: article.url || "",
              is_fake: !article.is_real,
              category: article.category || "Uncategorized",
              published_at: article.created_at || new Date().toISOString(),
            }));

            console.log(
              `Successfully prepared ${articles.length} articles after reset`
            );

            // Shuffle the articles to ensure random ordering of real and fake articles
            const shuffledArticles = [...articles].sort(
              () => Math.random() - 0.5
            );

            console.log(
              `Articles shuffled: ${shuffledArticles.length} articles in randomized order`
            );

            // Log the distribution of articles after shuffling
            const shuffledRealCount = shuffledArticles.filter(
              (a) => !a.is_fake
            ).length;
            const shuffledFakeCount = shuffledArticles.filter(
              (a) => a.is_fake
            ).length;
            console.log(
              `After shuffling: ${shuffledRealCount} real and ${shuffledFakeCount} fake articles`
            );

            return {
              id: uuidv4(),
              user_id: userId,
              articles: shuffledArticles,
              score: 0,
              answers: {},
            };
          }
        }
      }

      throw new Error("No unseen articles");
    }

    console.log(`Found ${randomArticles.length} unseen articles for the user`);

    // Log article IDs for debugging
    console.log(
      "Article IDs:",
      randomArticles.map((a) => a.article_id)
    );

    // Convert database articles to ArticleType
    const articles = randomArticles.map((article) => ({
      id: article.article_id,
      title: (article.title || "Untitled Article").replace(/^Fake:\s+/i, ""),
      content: article.content || "",
      author: article.author || "Unknown Author",
      publisher: article.source || "Unknown Publisher",
      url: article.url || "",
      is_fake: !article.is_real, // Note the inversion - database uses is_real, we use is_fake
      category: article.category || "Uncategorized",
      published_at: article.created_at || new Date().toISOString(),
    }));

    console.log(
      `Successfully prepared ${articles.length} articles for the game session`
    );

    // Shuffle the articles to ensure random ordering of real and fake articles
    const shuffledArticles = [...articles].sort(() => Math.random() - 0.5);

    console.log(
      `Articles shuffled: ${shuffledArticles.length} articles in randomized order`
    );

    // Log the distribution of articles after shuffling
    const shuffledRealCount = shuffledArticles.filter((a) => !a.is_fake).length;
    const shuffledFakeCount = shuffledArticles.filter((a) => a.is_fake).length;
    console.log(
      `After shuffling: ${shuffledRealCount} real and ${shuffledFakeCount} fake articles`
    );

    return {
      id: uuidv4(), // Generate a session ID
      user_id: userId,
      articles: shuffledArticles,
      score: 0,
      answers: {},
    };
  } catch (error) {
    console.error("Error in getGameSession:", error);
    // Only return error information, no mock articles
    return {
      id: "error-session",
      user_id: userId,
      articles: [],
      score: 0,
      answers: {},
      message:
        "Could not retrieve articles from the database. Please try again later.",
    };
  }
}

// Create a game session with fresh articles
export async function createGameSession(userId: string) {
  console.log(`Creating game session for user: ${userId}`);

  try {
    // First check if there are any articles in the database
    const { count: totalCount, error: countError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking article count:", countError);
      throw new Error("Could not check article count");
    }

    if (!totalCount || totalCount === 0) {
      console.error(
        "No articles found in the database. Please add articles in the admin panel."
      );
      throw new Error("No articles in database");
    }

    console.log(`Total articles in database: ${totalCount}`);

    // CRITICAL FIX: For small databases (up to 3 articles), always reset seen articles
    // to ensure all content is shown together in one session
    if (totalCount <= 3) {
      console.log(
        "Small article database detected. Showing all articles without automatic reset."
      );

      // Get the user's seen articles
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("seen_articles")
        .eq("id", userId)
        .single();

      // If all articles have been seen, return a message
      if (
        userData &&
        userData.seen_articles &&
        userData.seen_articles.length >= totalCount
      ) {
        console.log(
          "User has seen all articles in small database. Returning message."
        );
        return {
          id: uuidv4(),
          user_id: userId,
          articles: [],
          score: 0,
          message:
            "You've seen all available articles. Please use the 'Reset Seen Articles' button to play again.",
        };
      }
    }

    // Get the user's seen articles
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("seen_articles")
      .eq("id", userId)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("Error fetching user data:", userError);

      // Create user if not found
      if (userError.code === "PGRST116") {
        try {
          const { error: createError } = await supabase.from("users").insert({
            id: userId,
            username: "Player",
            email: "player@example.com", // This will be updated later
            points: 0,
            seen_articles: [],
          });

          if (createError) {
            console.error("Error creating user record:", createError);
          } else {
            console.log("Created new user record");
          }
        } catch (e) {
          console.error("Exception creating user record:", e);
        }
      }
    }

    const seenArticles = userData?.seen_articles || [];
    console.log(`User has seen ${seenArticles.length} articles:`, seenArticles);

    // For small databases, we'll get ALL articles regardless of seen status
    if (totalCount <= 3) {
      console.log(
        "Small database: Loading all articles regardless of seen status"
      );

      // Get all articles from the database
      const { data: allArticles, error: allError } = await supabase
        .from("news_articles")
        .select("*");

      if (allError) {
        console.error("Error fetching all articles:", allError);
        throw new Error("Could not fetch all articles");
      }

      if (!allArticles || allArticles.length === 0) {
        throw new Error("No articles found in database");
      }

      // Use all articles as our random articles
      const randomArticles = allArticles;

      // Debug: Log what type of articles we got
      const realNewsCount = randomArticles.filter((a) => a.is_real).length;
      const fakeNewsCount = randomArticles.filter((a) => !a.is_real).length;
      console.log(
        `Retrieved ${realNewsCount} real news and ${fakeNewsCount} fake news articles`
      );

      // Convert database articles to ArticleType
      const articles = randomArticles.map((article) => ({
        id: article.article_id,
        title: (article.title || "Untitled Article").replace(/^Fake:\s+/i, ""),
        content: article.content || "",
        author: article.author || "Unknown Author",
        publisher: article.source || "Unknown Publisher",
        url: article.url || "",
        is_fake: !article.is_real,
        category: article.category || "Uncategorized",
        published_at: article.created_at || new Date().toISOString(),
      }));

      console.log(
        `Successfully prepared ${articles.length} articles for the game session`
      );

      // Shuffle the articles to ensure random ordering of real and fake articles
      const shuffledArticles = [...articles].sort(() => Math.random() - 0.5);

      console.log(
        `Articles shuffled: ${shuffledArticles.length} articles in randomized order`
      );

      // Log the distribution of articles after shuffling
      const gameRealCount = shuffledArticles.filter((a) => !a.is_fake).length;
      const gameFakeCount = shuffledArticles.filter((a) => a.is_fake).length;
      console.log(
        `After shuffling: ${gameRealCount} real and ${gameFakeCount} fake articles`
      );

      return {
        id: uuidv4(), // Generate a session ID
        user_id: userId,
        articles: shuffledArticles,
        score: 0,
      };
    }

    // Original logic for larger databases continues here...
    // First get all articles for debugging
    const { data: allArticles } = await supabase
      .from("news_articles")
      .select("*");

    // Log all article IDs for debugging
    console.log(
      "All article IDs in database:",
      allArticles?.map((a) => a.article_id)
    );

    // Check if the user has seen all articles with better validation
    let hasSeenAllArticles = false;
    if (
      seenArticles &&
      seenArticles.length > 0 &&
      allArticles &&
      allArticles.length > 0
    ) {
      // Only consider valid article IDs
      const validSeenArticles = seenArticles.filter(
        (id: string) =>
          typeof id === "string" &&
          id.trim() !== "" &&
          allArticles.some((a) => a.article_id === id)
      );

      if (validSeenArticles.length > 0) {
        hasSeenAllArticles = validSeenArticles.length >= allArticles.length;
        console.log(
          `Valid seen articles: ${validSeenArticles.length}, Total articles: ${allArticles.length}`
        );
        console.log(`Has seen all articles: ${hasSeenAllArticles}`);
      } else {
        console.log(
          "No valid seen articles found, assuming user has not seen all articles"
        );
      }
    }

    // Check if the user has seen all articles
    if (hasSeenAllArticles) {
      console.log(
        "User has seen all available articles. Resetting seen articles list."
      );
      // Reset seen articles to empty to allow user to see articles again
      const { error: resetError } = await supabase
        .from("users")
        .update({ seen_articles: [] })
        .eq("id", userId);

      if (resetError) {
        console.error("Error resetting seen articles:", resetError);
        // Continue anyway but log the error
      } else {
        console.log("Successfully reset user's seen articles");
      }
      seenArticles.length = 0;
    }

    // Fetch more articles from the database that haven't been seen by this user
    let query = supabase.from("news_articles").select("*");

    // Filter out articles the user has already seen
    if (seenArticles.length > 0) {
      // Fixed: Handle the query correctly for any number of seen articles
      // Making sure we're using a properly formatted array for the filter
      const formattedSeenArticles = seenArticles.filter(
        (id: string) => id && typeof id === "string" && id.trim() !== ""
      );

      if (formattedSeenArticles.length > 0) {
        query = query.not(
          "article_id",
          "in",
          `(${formattedSeenArticles.join(",")})`
        );
        console.log(
          `Filtering out seen articles: ${JSON.stringify(
            formattedSeenArticles
          )}`
        );
      } else {
        console.log("No valid article IDs to filter - fetching all articles");
      }
    } else {
      console.log("No articles to filter - fetching all articles");
    }

    // Make sure we fetch both real and fake news
    // Add randomization to avoid showing articles in the same order
    // Debug: Log the query before execution
    console.log("Looking for articles with query:", query);

    // First, count how many real and fake articles would be returned
    const { count: realCount, error: realCountError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_real", true);

    const { count: fakeCount, error: fakeCountError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_real", false);

    console.log(
      `Potential real articles: ${realCount}, Potential fake articles: ${fakeCount}`
    );

    // Fetch BOTH real and fake news separately to ensure we get both types
    let randomArticles: any[] = [];
    let error = null;

    // Fetch real news
    if (realCount && realCount > 0) {
      const { data: realArticles, error: realError } = await supabase
        .from("news_articles")
        .select("*")
        .eq("is_real", true)
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(5);

      if (realError) {
        console.error("Error fetching real articles:", realError);
        error = realError;
      } else if (realArticles) {
        randomArticles = [...randomArticles, ...realArticles];
        console.log(`Retrieved ${realArticles.length} real news articles`);
      }
    }

    // Fetch fake news
    if (fakeCount && fakeCount > 0) {
      const { data: fakeArticles, error: fakeError } = await supabase
        .from("news_articles")
        .select("*")
        .eq("is_real", false)
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(5);

      if (fakeError) {
        console.error("Error fetching fake articles:", fakeError);
        if (!error) error = fakeError;
      } else if (fakeArticles) {
        randomArticles = [...randomArticles, ...fakeArticles];
        console.log(`Retrieved ${fakeArticles.length} fake news articles`);
      }
    }

    // If we couldn't fetch either type separately, try the original approach
    if (randomArticles.length === 0) {
      console.log("Falling back to combined article query");
      const { data: allArticles, error: queryError } = await supabase
        .from("news_articles")
        .select("*")
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(10);

      if (queryError) {
        error = queryError;
      } else if (allArticles) {
        randomArticles = allArticles;
      }
    }

    // Debug: Log what type of articles we got
    if (randomArticles && randomArticles.length > 0) {
      const realNewsCount = randomArticles.filter((a) => a.is_real).length;
      const fakeNewsCount = randomArticles.filter((a) => !a.is_real).length;
      console.log(
        `Retrieved ${realNewsCount} real news and ${fakeNewsCount} fake news articles`
      );
    }

    if (error) {
      console.error("Error fetching articles:", error);
      throw new Error(`Failed to fetch articles: ${JSON.stringify(error)}`);
    }

    if (!randomArticles || randomArticles.length === 0) {
      console.error("No more unseen articles found for the user");
      return {
        success: false,
        error: "No unseen articles available",
        articles: [],
      };
    }

    console.log(
      `Found ${randomArticles.length} more unseen articles for the user:`,
      randomArticles.map((a) => a.article_id)
    );

    // Convert database articles to ArticleType
    const articles = randomArticles.map((article) => ({
      id: article.article_id,
      title: (article.title || "Untitled Article").replace(/^Fake:\s+/i, ""),
      content: article.content || "",
      author: article.author || "Unknown Author",
      publisher: article.source || "Unknown Publisher",
      url: article.url || "",
      is_fake: !article.is_real, // Note the inversion - database uses is_real, we use is_fake
      category: article.category || "Uncategorized",
      published_at: article.created_at || new Date().toISOString(),
    }));

    console.log(
      `Successfully prepared ${articles.length} articles for the game session`
    );

    return {
      id: uuidv4(), // Generate a session ID
      user_id: userId,
      articles: articles,
      score: 0,
    };
  } catch (error) {
    console.error("Error in createGameSession:", error);
    // Only return error information, no mock articles
    return {
      id: "error-session",
      user_id: userId,
      articles: [],
      score: 0,
      message:
        "Could not retrieve articles from the database. Please try again later.",
    };
  }
}

// Submit an answer and get feedback
export async function submitAnswer(
  sessionId: string,
  userId: string,
  articleId: string,
  isFake: boolean,
  reason?: string | null | undefined
): Promise<SubmitAnswerResponse> {
  console.log(
    `Submitting answer for article ${articleId} in session ${sessionId}`
  );

  try {
    // Validate required parameters
    if (!sessionId) {
      console.error("Session ID is required");
      return {
        error: "Session ID is required for submitting an answer",
        sessionId: undefined,
        userId,
        articleId,
        isFake,
        reason,
        isCorrect: false,
      };
    }

    if (!userId) {
      console.error("User ID is required");
      return {
        error: "User ID is required for submitting an answer",
        sessionId,
        userId: undefined,
        articleId,
        isFake,
        reason,
        isCorrect: false,
      };
    }

    if (!articleId) {
      console.error("Article ID is required");
      return {
        error: "Article ID is required for submitting an answer",
        sessionId,
        userId,
        articleId: undefined,
        isFake,
        reason,
        isCorrect: false,
      };
    }

    // Try to fetch the article from the database first
    const { data: dbArticle, error } = await supabase
      .from("news_articles")
      .select("*")
      .eq("article_id", articleId)
      .single();

    // If article is found in the database
    if (dbArticle && !error) {
      const isCorrect = isFake === !dbArticle.is_real; // Note the inversion - database uses is_real, we use is_fake

      // Create feedback based on database article
      const feedback: FeedbackType = {
        article_id: articleId,
        is_fake: !dbArticle.is_real,
        reason: !dbArticle.is_real ? dbArticle.reason || null : null,
        explanation: !dbArticle.is_real
          ? dbArticle.explanation ||
            "This article contains misleading information."
          : "This article is from a reliable source and contains factual information.",
        message: isCorrect
          ? "Good job! You correctly identified this article."
          : "Sorry, that's not correct. Keep practicing!",
      };

      // Record this answer in the game_sessions table using the centralized function
      let sessionRecordingWarning = null;
      try {
        // Debug info before recording
        console.log("About to record game session with:", {
          userId,
          articleId,
          userAnswer: isFake,
          selectedReason: reason,
          sessionId,
        });

        const { error: sessionError } = await recordGameSession(
          userId,
          articleId,
          isFake,
          reason,
          sessionId
        );

        if (sessionError) {
          // Special handling for empty error objects
          if (
            sessionError &&
            typeof sessionError === "object" &&
            Object.keys(sessionError).length === 0
          ) {
            console.log(
              "Empty error object from recordGameSession - continuing without error"
            );
            // Empty error object is a special case - continue without showing error
          } else if (
            sessionError instanceof Error &&
            sessionError.message &&
            (sessionError.message.includes("duplicate key value") ||
              sessionError.message.includes("Record already exists") ||
              sessionError.message.includes("already exists") ||
              sessionError.message.includes("23505"))
          ) {
            console.log(
              "Duplicate session record detected - continuing without error"
            );
            // Session already recorded, continue without error
          } else {
            console.error(
              "Error recording game session:",
              typeof sessionError === "object"
                ? JSON.stringify(sessionError, null, 2)
                : sessionError
            );
            sessionRecordingWarning =
              "Failed to record your game session, but your answer was processed.";
          }
          // Continue with the submission despite the recording error
        }
      } catch (recordError) {
        // Check for duplicate key error in the caught exception
        if (
          recordError &&
          typeof recordError === "object" &&
          (("code" in recordError && recordError.code === "23505") ||
            (recordError instanceof Error &&
              recordError.message &&
              (recordError.message.includes("duplicate key") ||
                recordError.message.includes("already exists"))))
        ) {
          console.log(
            "Duplicate session record exception - continuing without error"
          );
          // This is expected, don't show warning
        } else {
          // Log the error but continue with the submission
          console.error("Exception recording game session:", recordError);
          sessionRecordingWarning =
            "An error occurred while recording your game session, but your answer was processed.";
        }
      }

      return {
        feedback: feedback,
        sessionId: sessionId,
        userId: userId,
        articleId: articleId,
        isFake: isFake,
        reason: reason,
        isCorrect: isCorrect,
        warning: sessionRecordingWarning,
      };
    }

    // If article is not found in the database, return an error
    if (error) {
      console.error("Database error while fetching article:", error);
    }

    return {
      error: error
        ? `Database error: ${error.message}`
        : "Article not found in the database",
      sessionId: sessionId,
      userId: userId,
      articleId: articleId,
      isFake: isFake,
      reason: reason,
      isCorrect: false,
    };
  } catch (error) {
    console.error("Error in submitAnswer:", error);
    // Only return error information, no mock articles
    return {
      error:
        error instanceof Error
          ? error.message
          : "An error occurred while submitting the answer",
      sessionId: sessionId,
      userId: userId,
      articleId: articleId,
      isFake: isFake,
      reason: reason,
      isCorrect: false,
    };
  }
}

// Generate more articles for the game
export async function generateMoreArticles(sessionId: string, userId: string) {
  console.log(`Generating more articles for session ${sessionId}`);

  try {
    // Verify Supabase client is initialized
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return {
        success: false,
        error: "Database connection not available",
        articles: [],
      };
    }

    // Test connection with a simple query first
    try {
      const { data: testData, error: testError } = await supabase
        .from("news_articles")
        .select("article_id")
        .limit(1);

      if (testError) {
        console.error("Database connection test failed:", testError);
        return {
          success: false,
          error: `Database connection test failed: ${JSON.stringify(
            testError
          )}`,
          articles: [],
        };
      }

      console.log("Database connection test successful");
    } catch (connectionErr) {
      console.error(
        "Exception during database connection test:",
        connectionErr
      );
      return {
        success: false,
        error: `Database connection exception: ${connectionErr}`,
        articles: [],
      };
    }

    // Get the user's seen articles
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("seen_articles")
      .eq("id", userId)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("Error fetching user data:", userError);
      return {
        success: false,
        error: `Failed to fetch user data: ${JSON.stringify(userError)}`,
        articles: [],
      };
    }

    const seenArticles = userData?.seen_articles || [];
    console.log(`User has seen ${seenArticles.length} articles:`, seenArticles);

    // Query to get unseen articles from the database
    let query = supabase.from("news_articles").select("*");

    // Filter out articles the user has already seen
    if (seenArticles.length > 0) {
      // Fixed: Handle the query correctly for any number of seen articles
      // Making sure we're using a properly formatted array for the filter
      const formattedSeenArticles = seenArticles.filter(
        (id: string) => id && typeof id === "string" && id.trim() !== ""
      );

      if (formattedSeenArticles.length > 0) {
        query = query.not(
          "article_id",
          "in",
          `(${formattedSeenArticles.join(",")})`
        );
        console.log(
          `Filtering out seen articles: ${JSON.stringify(
            formattedSeenArticles
          )}`
        );
      } else {
        console.log("No valid article IDs to filter - fetching all articles");
      }
    } else {
      console.log("No articles to filter - fetching all articles");
    }

    // Make sure we fetch both real and fake news
    // Add randomization to avoid showing articles in the same order
    // Debug: Log the query before execution
    console.log("Looking for articles with query:", query);

    // First, count how many real and fake articles would be returned
    const { count: realCount, error: realCountError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_real", true);

    const { count: fakeCount, error: fakeCountError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_real", false);

    console.log(
      `Potential real articles: ${realCount}, Potential fake articles: ${fakeCount}`
    );

    // Fetch BOTH real and fake news separately to ensure we get both types
    let randomArticles: any[] = [];
    let error = null;

    // Fetch real news
    if (realCount && realCount > 0) {
      const { data: realArticles, error: realError } = await supabase
        .from("news_articles")
        .select("*")
        .eq("is_real", true)
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(5);

      if (realError) {
        console.error("Error fetching real articles:", realError);
        error = realError;
      } else if (realArticles) {
        randomArticles = [...randomArticles, ...realArticles];
        console.log(`Retrieved ${realArticles.length} real news articles`);
      }
    }

    // Fetch fake news
    if (fakeCount && fakeCount > 0) {
      const { data: fakeArticles, error: fakeError } = await supabase
        .from("news_articles")
        .select("*")
        .eq("is_real", false)
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(5);

      if (fakeError) {
        console.error("Error fetching fake articles:", fakeError);
        if (!error) error = fakeError;
      } else if (fakeArticles) {
        randomArticles = [...randomArticles, ...fakeArticles];
        console.log(`Retrieved ${fakeArticles.length} fake news articles`);
      }
    }

    // If we couldn't fetch either type separately, try the original approach
    if (randomArticles.length === 0) {
      console.log("Falling back to combined article query");
      const { data: allArticles, error: queryError } = await supabase
        .from("news_articles")
        .select("*")
        .not(
          "article_id",
          "in",
          seenArticles.length > 0 ? `(${seenArticles.join(",")})` : "()"
        )
        .order("article_id", { ascending: false })
        .limit(10);

      if (queryError) {
        error = queryError;
      } else if (allArticles) {
        randomArticles = allArticles;
      }
    }

    // Debug: Log what type of articles we got
    if (randomArticles && randomArticles.length > 0) {
      const realNewsCount = randomArticles.filter((a) => a.is_real).length;
      const fakeNewsCount = randomArticles.filter((a) => !a.is_real).length;
      console.log(
        `Retrieved ${realNewsCount} real news and ${fakeNewsCount} fake news articles`
      );
    }

    if (error) {
      console.error("Error fetching articles:", error);
      throw new Error(`Failed to fetch articles: ${JSON.stringify(error)}`);
    }

    if (!randomArticles || randomArticles.length === 0) {
      console.error("No more unseen articles found for the user");
      return {
        success: false,
        error: "No unseen articles available",
        articles: [],
      };
    }

    console.log(
      `Found ${randomArticles.length} more unseen articles for the user:`,
      randomArticles.map((a) => a.article_id)
    );

    // Convert database articles to ArticleType
    const articles = randomArticles.map((article) => ({
      id: article.article_id,
      title: (article.title || "Untitled Article").replace(/^Fake:\s+/i, ""),
      content: article.content || "",
      author: article.author || "Unknown Author",
      publisher: article.source || "Unknown Publisher",
      url: article.url || "",
      is_fake: !article.is_real, // Note the inversion - database uses is_real, we use is_fake
      category: article.category || "Uncategorized",
      published_at: article.created_at || new Date().toISOString(),
    }));

    console.log(
      `Successfully prepared ${articles.length} articles for the game session`
    );

    return {
      success: true,
      articles: articles,
    };
  } catch (error) {
    console.error("Error in generateMoreArticles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      articles: [],
    };
  }
}

// Add this helper function to reset all seen articles
export async function resetAllArticles(userId: string) {
  console.log(`Resetting all seen articles for user: ${userId}`);

  try {
    // First verify the user exists
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, seen_articles")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error finding user for reset:", userError);
      if (userError.code === "PGRST116") {
        // User not found, create a new user record with empty seen_articles
        const { error: createError } = await supabase.from("users").insert({
          id: userId,
          username: "Player",
          email: "player@example.com",
          points: 0,
          seen_articles: [],
        });

        if (createError) {
          console.error("Error creating user record:", createError);
          return { success: false, error: "Failed to create user record" };
        }

        console.log("Created new user with empty seen_articles");
        return {
          success: true,
          message: "Successfully reset all seen articles",
        };
      }

      return {
        success: false,
        error: `Error fetching user data: ${JSON.stringify(userError)}`,
      };
    }

    // If user exists, update their seen_articles to an empty array
    const { error: updateError } = await supabase
      .from("users")
      .update({ seen_articles: [] })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating seen_articles:", updateError);
      return {
        success: false,
        error: `Failed to update seen_articles: ${JSON.stringify(updateError)}`,
      };
    }

    console.log(`Successfully reset seen_articles for user ${userId}`);
    return {
      success: true,
      message: "Successfully reset all seen articles",
    };
  } catch (error) {
    console.error("Error in resetAllArticles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
