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

    // Check if the user has seen all articles
    // For small article databases, we want to avoid resetting too quickly
    // Only reset when they've seen ALL articles AND there are more than just a few
    if (seenArticles.length >= totalCount && totalCount > 3) {
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
    } else if (seenArticles.length >= totalCount) {
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

    // Filter out articles the user has already seen
    if (seenArticles.length > 0) {
      // Making sure we're using a properly formatted array for the filter
      const formattedSeenArticles = seenArticles.filter(
        (id: string) => id && typeof id === "string"
      );
      console.log(
        `Formatted seen articles for filtering: ${JSON.stringify(
          formattedSeenArticles
        )}`
      );

      if (formattedSeenArticles.length > 0) {
        query = query.not("article_id", "in", formattedSeenArticles);
        console.log("Applied filter to exclude seen articles");
      } else {
        console.log(
          "No valid article IDs to filter, fetching any available articles"
        );
      }
    } else {
      console.log("No articles to filter out, fetching any available articles");
    }

    // Add randomization to avoid showing articles in the same order
    // Use raw SQL for random ordering
    const { data: randomArticles, error } = await query
      .order("article_id", { ascending: false })
      .limit(10);

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
    // Only use mock articles as a last resort
    return {
      id: "mock-session-id",
      user_id: userId,
      articles: getMockArticles(5, true), // Set fixed=true to easily identify mock articles
      score: 0,
      answers: {},
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

    // Check if the user has seen all articles
    if (seenArticles.length >= totalCount) {
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
        (id: string) => id && typeof id === "string"
      );
      console.log(
        `Formatted seen articles for filtering: ${JSON.stringify(
          formattedSeenArticles
        )}`
      );

      if (formattedSeenArticles.length > 0) {
        query = query.not("article_id", "in", formattedSeenArticles);
        console.log("Applied filter to exclude seen articles");
      } else {
        console.log(
          "No valid article IDs to filter, fetching any available articles"
        );
      }
    } else {
      console.log("No articles to filter out, fetching any available articles");
    }

    // First, get all articles for debugging
    const { data: allArticles } = await supabase
      .from("news_articles")
      .select("article_id");
    console.log(
      "All article IDs in database:",
      allArticles?.map((a) => a.article_id)
    );

    // Add randomization to avoid showing articles in the same order
    // Use regular ordering since true randomization is hard with Supabase
    const { data: randomArticles, error } = await query
      .order("article_id", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching articles:", error);
      throw new Error("Failed to fetch articles");
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
    // Only use mock articles as a last resort
    return {
      id: "mock-session-id",
      user_id: userId,
      articles: getMockArticles(5, true), // Set fixed=true to easily identify mock articles
      score: 0,
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
    }

    const seenArticles = userData?.seen_articles || [];
    console.log(`User has seen ${seenArticles.length} articles`);

    // Check if the user has seen all articles
    if (seenArticles.length >= totalCount) {
      console.log(
        "User has seen all available articles. Resetting seen articles list."
      );
      // Reset seen articles to empty to allow user to see articles again
      await supabase
        .from("users")
        .update({ seen_articles: [] })
        .eq("id", userId);
      seenArticles.length = 0;
    }

    // Fetch more articles from the database that haven't been seen by this user
    let query = supabase.from("news_articles").select("*");

    // Filter out articles the user has already seen
    if (seenArticles.length > 0) {
      // Fixed: Handle the query correctly for any number of seen articles
      query = query.not("article_id", "in", seenArticles);
    }

    // Add randomization to avoid showing articles in the same order
    // Use regular ordering since true randomization is hard with Supabase
    const { data: moreArticles, error } = await query
      .order("article_id", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching more articles:", error);
      throw new Error("Failed to fetch articles");
    }

    if (!moreArticles || moreArticles.length === 0) {
      console.error("No more unseen articles found for the user");
      throw new Error("No unseen articles");
    }

    console.log(
      `Found ${moreArticles.length} more unseen articles for the user`
    );

    // Convert database articles to ArticleType
    const articles = moreArticles.map((article) => ({
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
    // Only use mock articles as a last resort
    return {
      success: true,
      articles: getMockArticles(3, true), // Set fixed=true to easily identify mock articles
    };
  }
}

// Helper function to generate mock articles (used as fallback)
function getMockArticles(count = 5, fixed = false): ArticleType[] {
  console.warn(
    "Falling back to mock articles. This should only happen if there are no articles in the database."
  );

  // Define fixed mock articles for easier identification
  const mockArticles = [
    {
      id: "mock-article-1",
      title: "[MOCK] Shocking Study Reveals Unexpected Health Risk",
      content:
        "<p>This is a mock article used when no real articles are available in the database. Please add articles in the admin panel.</p><p>A recent study has made alarming claims about everyday products. However, the methodology is questionable and the conclusions are not supported by mainstream science.</p>",
      author: "Mock Author",
      publisher: "Mock News",
      url: "https://example.com/mock-news",
      is_fake: true,
      category: "Health Misinformation",
      published_at: new Date().toISOString(),
    },
    {
      id: "mock-article-2",
      title: "[MOCK] New Research Highlights Benefits of Regular Exercise",
      content:
        "<p>This is a mock article used when no real articles are available in the database. Please add articles in the admin panel.</p><p>According to a peer-reviewed study published in a reputable journal, regular exercise continues to show significant health benefits across all age groups.</p>",
      author: "Dr. Mock Smith",
      publisher: "Mock Science Journal",
      url: "https://example.com/mock-science",
      is_fake: false,
      category: "Health",
      published_at: new Date().toISOString(),
    },
    {
      id: "mock-article-3",
      title: "[MOCK] Revolutionary Technology Claims to Solve Energy Crisis",
      content:
        "<p>This is a mock article used when no real articles are available in the database. Please add articles in the admin panel.</p><p>A startup company claims to have developed a revolutionary technology that produces unlimited clean energy, but experts remain skeptical about the lack of peer-reviewed evidence.</p>",
      author: "Mock Reporter",
      publisher: "Mock Tech News",
      url: "https://example.com/mock-tech",
      is_fake: true,
      category: "Technology",
      published_at: new Date().toISOString(),
    },
    {
      id: "mock-article-4",
      title: "[MOCK] Government Announces New Climate Agreement",
      content:
        "<p>This is a mock article used when no real articles are available in the database. Please add articles in the admin panel.</p><p>World leaders have reached a historic agreement on climate change targets during the latest international summit, according to official reports released yesterday.</p>",
      author: "Political Mock",
      publisher: "Mock World News",
      url: "https://example.com/mock-politics",
      is_fake: false,
      category: "Politics",
      published_at: new Date().toISOString(),
    },
    {
      id: "mock-article-5",
      title: "[MOCK] Scientists Discover Ancient Civilization Beneath Ocean",
      content:
        "<p>This is a mock article used when no real articles are available in the database. Please add articles in the admin panel.</p><p>Researchers claim to have found evidence of an advanced ancient civilization beneath the Pacific Ocean, but other archaeologists have questioned the validity of the findings.</p>",
      author: "Mock Archaeologist",
      publisher: "Mock Discovery",
      url: "https://example.com/mock-discovery",
      is_fake: true,
      category: "Science",
      published_at: new Date().toISOString(),
    },
  ];

  if (fixed) {
    // Return a subset of the fixed mock articles
    return mockArticles.slice(0, Math.min(count, mockArticles.length));
  }

  // Generate dynamic mock articles (the original behavior)
  const articles: ArticleType[] = [];

  for (let i = 0; i < count; i++) {
    const isFake = Math.random() > 0.5;

    articles.push({
      id: `article-${Date.now()}-${i}`,
      title: `[MOCK] ${
        isFake
          ? "Shocking Study Reveals Unexpected Health Risk"
          : "New Research Highlights Benefits of Regular Exercise"
      }`,
      content: `<p>This is a mock article. Please add real articles in the admin panel.</p>${
        isFake
          ? "<p>A recent study has made alarming claims about everyday products. However, the methodology is questionable and the conclusions are not supported by mainstream science.</p>"
          : "<p>According to a peer-reviewed study published in a reputable journal, regular exercise continues to show significant health benefits across all age groups.</p>"
      }`,
      author: isFake ? "Mock Author" : "Dr. Mock Smith",
      publisher: isFake ? "Mock News Online" : "Mock Science Journal",
      url: isFake
        ? "https://example.com/mock-fake-news"
        : "https://example.com/mock-real-news",
      is_fake: isFake,
      category: isFake ? "Health Misinformation" : "Health",
      published_at: new Date().toISOString(),
    });
  }

  return articles;
}
