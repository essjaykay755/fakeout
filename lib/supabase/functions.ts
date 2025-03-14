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
  reason?: string;
  explanation?: string;
  message: string;
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
      const { data: realArticles, error: realError } = await query
        .eq("is_real", true)
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
      const { data: fakeArticles, error: fakeError } = await query
        .eq("is_real", false)
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
      const { data: allArticles, error: queryError } = await query
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

            return {
              id: uuidv4(),
              user_id: userId,
              articles: articles,
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

    return {
      id: uuidv4(), // Generate a session ID
      user_id: userId,
      articles: articles,
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

    // First get all articles for debugging
    const { data: allArticles } = await supabase
      .from("news_articles")
      .select("article_id");
    console.log(
      "All article IDs in database:",
      allArticles?.map((a) => a.article_id)
    );

    // Check if the user has seen all articles - only if seenArticles actually contains valid IDs
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

      // Only consider it "all seen" if there are actually valid seen articles
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
    } else {
      console.log(
        "Either seen articles or all articles is empty, assuming user has not seen all articles"
      );
    }

    if (hasSeenAllArticles) {
      console.log("User has seen all available articles.");

      // If there's only one article or just a few articles, we want to avoid resetting too quickly
      if (totalCount <= 3) {
        console.log(
          "Limited articles available. Not resetting seen articles yet."
        );
        // Don't reset seen_articles in this case, return a special message
        return {
          id: uuidv4(), // Generate a session ID
          user_id: userId,
          articles: [], // Empty articles array
          score: 0,
          message:
            "You've seen all available articles. Please check back later for new content!",
        };
      } else {
        // For larger databases, we can reset to allow users to see articles again
        console.log(
          "Resetting seen articles list for a fresh game experience."
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
          // Clear local array
          seenArticles.length = 0;
        }
      }
    }

    // Log what we're looking for
    console.log(`Looking for articles NOT in: ${JSON.stringify(seenArticles)}`);

    // Fetch random articles from the database that haven't been seen by this user
    let query = supabase.from("news_articles").select("*");

    // Filter out articles the user has already seen
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
      const { data: realArticles, error: realError } = await query
        .eq("is_real", true)
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
      const { data: fakeArticles, error: fakeError } = await query
        .eq("is_real", false)
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
      const { data: allArticles, error: queryError } = await query
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
  reason?: string
) {
  console.log(
    `Submitting answer for article ${articleId} in session ${sessionId}`
  );

  try {
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
        reason: !dbArticle.is_real ? dbArticle.reason : undefined,
        explanation: !dbArticle.is_real
          ? dbArticle.explanation ||
            "This article contains misleading information."
          : "This article is from a reliable source and contains factual information.",
        message: isCorrect
          ? "Good job! You correctly identified this article."
          : "Sorry, that's not correct. Keep practicing!",
      };

      // Record this answer in the game_sessions table using the centralized function
      const { error: sessionError } = await recordGameSession(
        userId,
        articleId,
        isFake,
        reason || undefined,
        sessionId
      );

      if (sessionError) {
        console.error("Error recording game session:", sessionError);
      }

      // CRITICAL FIX: Always update the seen_articles array
      // First, check if this article is already in the user's seen_articles
      try {
        // Get the current seen_articles for this user
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("seen_articles, points")
          .eq("id", userId)
          .single();

        // If user data is found
        if (userData) {
          // Convert to array if it's null
          const currentSeenArticles = userData.seen_articles || [];

          // Log current state for debugging
          console.log(
            `Current seen articles for user ${userId}:`,
            currentSeenArticles
          );
          console.log(
            `Checking if article ${articleId} is already in seen articles`
          );

          // Only add if not already in the array
          if (!currentSeenArticles.includes(articleId)) {
            console.log(`Adding article ${articleId} to user's seen articles`);

            // Create a new array with the article added
            const newSeenArticles = [...currentSeenArticles, articleId];
            console.log(`New seen articles array:`, newSeenArticles);

            // Update user record with the new seen_articles array
            const { error: updateError } = await supabase
              .from("users")
              .update({
                seen_articles: newSeenArticles,
                // Add points if the answer was correct
                points: userData.points + (isCorrect ? 10 : 0),
              })
              .eq("id", userId);

            if (updateError) {
              console.error("Error updating seen_articles:", updateError);

              // Try one more time with a different approach if there was an error
              const { error: retryError } = await supabase.rpc(
                "update_seen_articles",
                {
                  p_user_id: userId,
                  p_article_id: articleId,
                }
              );

              if (retryError) {
                console.error(
                  "Retry error updating seen_articles via RPC:",
                  retryError
                );
              } else {
                console.log(
                  "Successfully updated seen_articles via RPC fallback"
                );
              }
            } else {
              console.log(
                `Successfully added article ${articleId} to user's seen articles`
              );
            }
          } else {
            console.log(`Article ${articleId} already in user's seen_articles`);
          }
        } else if (userError) {
          console.error("Error fetching user data:", userError);

          // If user doesn't exist, create them with this article as seen
          if (userError.code === "PGRST116") {
            console.log(
              `User ${userId} not found. Creating new user record with article ${articleId} as seen`
            );

            const { error: createError } = await supabase.from("users").insert({
              id: userId,
              username: "Player",
              email: "player@example.com",
              points: isCorrect ? 10 : 0,
              seen_articles: [articleId],
            });

            if (createError) {
              console.error(
                "Error creating user with seen_articles:",
                createError
              );
            } else {
              console.log(
                `Successfully created user ${userId} with article ${articleId} as seen`
              );
            }
          }
        }
      } catch (updateError) {
        console.error("Error in updating seen_articles:", updateError);
      }

      return {
        success: true,
        feedback,
      };
    } else {
      // Fall back to mock logic if article not found
      const articles = getMockArticles();
      const article = articles.find((a) => a.id === articleId);

      const isCorrect = article ? isFake === article.is_fake : false;

      // Mock feedback
      const feedback: FeedbackType = {
        article_id: articleId,
        is_fake: article?.is_fake || false,
        reason: article?.is_fake ? "Fake news reason" : undefined,
        explanation: article?.is_fake
          ? "This article contains misleading information."
          : "This article is from a reliable source and contains factual information.",
        message: isCorrect
          ? "Good job! You correctly identified this article."
          : "Sorry, that's not correct. Keep practicing!",
      };

      // Still record the session for consistency using the centralized function
      const { error: sessionError } = await recordGameSession(
        userId,
        articleId,
        isFake,
        reason || undefined,
        sessionId
      );

      if (sessionError) {
        console.error("Error recording game session:", sessionError);
      }

      // Add the same seen_articles update logic for mock articles
      try {
        // Get the current seen_articles for this user
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("seen_articles, points")
          .eq("id", userId)
          .single();

        // If user data is found
        if (userData) {
          // Convert to array if it's null
          const currentSeenArticles = userData.seen_articles || [];

          // Log current state for debugging
          console.log(
            `Current seen articles for mock article scenario:`,
            currentSeenArticles
          );

          // Only add if not already in the array
          if (!currentSeenArticles.includes(articleId)) {
            console.log(
              `Adding mock article ${articleId} to user's seen articles`
            );

            // Create a new array with the article added
            const newSeenArticles = [...currentSeenArticles, articleId];

            // Update user record with the new seen_articles array
            const { error: updateError } = await supabase
              .from("users")
              .update({
                seen_articles: newSeenArticles,
                points: userData.points + (isCorrect ? 10 : 0),
              })
              .eq("id", userId);

            if (updateError) {
              console.error(
                "Error updating seen_articles for mock article:",
                updateError
              );
            } else {
              console.log(
                `Successfully added mock article ${articleId} to user's seen articles`
              );
            }
          } else {
            console.log(
              `Mock article ${articleId} already in user's seen_articles`
            );
          }
        } else if (userError) {
          console.error(
            "Error fetching user data for mock article:",
            userError
          );

          // If user doesn't exist, create them with this article as seen
          if (userError.code === "PGRST116") {
            const { error: createError } = await supabase.from("users").insert({
              id: userId,
              username: "Player",
              email: "player@example.com",
              points: isCorrect ? 10 : 0,
              seen_articles: [articleId],
            });

            if (createError) {
              console.error(
                "Error creating user with mock seen_articles:",
                createError
              );
            }
          }
        }
      } catch (updateError) {
        console.error(
          "Error in updating seen_articles for mock article:",
          updateError
        );
      }

      return {
        success: true,
        feedback,
      };
    }
  } catch (error) {
    console.error("Error in submitAnswer:", error);
    return {
      success: false,
      message: "Failed to submit answer",
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

    // First check if there are any articles in the database
    const { count: totalCount, error: countError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking article count:", countError);
      return {
        success: false,
        error: `Could not check article count: ${JSON.stringify(countError)}`,
        articles: [],
      };
    }

    if (!totalCount || totalCount === 0) {
      console.error(
        "No articles found in the database. Please add articles in the admin panel."
      );
      return {
        success: false,
        error:
          "No articles in database. Please contact an administrator to add content.",
        articles: [],
      };
    }

    console.log(`Total articles in database: ${totalCount}`);

    // Get the user's seen articles
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("seen_articles")
      .eq("id", userId)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("Error fetching user data:", userError);
      // Continue with empty seen articles list instead of failing
      console.log("Will proceed with empty seen articles list");
    }

    const seenArticles = userData?.seen_articles || [];
    console.log(`User has seen ${seenArticles.length} articles:`, seenArticles);

    // Log all article IDs for debugging
    try {
      const { data: allArticles } = await supabase
        .from("news_articles")
        .select("article_id");
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
    } catch (debugErr) {
      console.error("Error fetching all article IDs:", debugErr);
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
      const { data: realArticles, error: realError } = await query
        .eq("is_real", true)
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
      const { data: fakeArticles, error: fakeError } = await query
        .eq("is_real", false)
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
      const { data: allArticles, error: queryError } = await query
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
      `Successfully prepared ${articles.length} more articles for the game session`
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

// Helper function to generate mock articles (used as fallback)
function getMockArticles(count = 5, fixed = false): ArticleType[] {
  console.warn(
    "Not returning mock articles as per user preference. Please ensure database has articles."
  );

  // Return empty array instead of mock articles
  return [];
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
          message: "Created new user with empty seen articles",
        };
      }

      return {
        success: false,
        error: `User lookup failed: ${userError.message}`,
      };
    }

    // Reset seen articles to empty to allow user to see articles again
    const { error: updateError } = await supabase
      .from("users")
      .update({ seen_articles: [] })
      .eq("id", userId);

    if (updateError) {
      console.error("Error resetting seen articles:", updateError);
      return {
        success: false,
        error: `Failed to reset: ${updateError.message}`,
      };
    }

    // Verify the reset worked by checking the user record again
    const { data: verifyData, error: verifyError } = await supabase
      .from("users")
      .select("seen_articles")
      .eq("id", userId)
      .single();

    if (verifyError) {
      console.error("Error verifying reset:", verifyError);
      return {
        success: true,
        warning: "Reset command sent but verification failed",
      };
    }

    if (verifyData.seen_articles && verifyData.seen_articles.length > 0) {
      console.warn(
        "Reset may not have been complete:",
        verifyData.seen_articles
      );
      return { success: true, warning: "Reset may be incomplete" };
    }

    console.log("Successfully reset user's seen articles");
    return { success: true, message: "Successfully reset seen articles" };
  } catch (error) {
    console.error("Exception resetting user's seen articles:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
