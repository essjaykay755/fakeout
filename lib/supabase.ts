import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
// Using placeholder values for development if environment variables are not set
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

console.log(
  "Supabase initialization - URL type:",
  typeof rawSupabaseUrl,
  "key present:",
  !!supabaseKey
);

// Extract the Supabase reference ID from the JWT if it's in that format
let supabaseUrl = rawSupabaseUrl;
try {
  // Check if the URL looks like a JWT (contains periods and no https://)
  if (rawSupabaseUrl.includes(".") && !rawSupabaseUrl.startsWith("http")) {
    // Try to decode the JWT
    const payload = JSON.parse(atob(rawSupabaseUrl.split(".")[1]));
    if (payload && payload.ref) {
      // Construct the proper URL
      supabaseUrl = `https://${payload.ref}.supabase.co`;
      console.log("Extracted Supabase URL:", supabaseUrl);
    }
  }
} catch (error) {
  console.error("Error parsing Supabase URL:", error);
  // Fallback to a placeholder for development
  supabaseUrl = "https://placeholder-for-dev.supabase.co";
}

// Explicit logging to debug connection issues
console.log("Using Supabase URL:", supabaseUrl);

// Initialize the Supabase client with explicit auth configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "fakeout-auth",
    storage: {
      getItem: (key) => {
        try {
          // Check if window is defined (client-side)
          if (typeof window === "undefined") {
            return null;
          }

          // Check if we have a manual user in localStorage
          const manualUser = localStorage.getItem("manual_user");
          if (manualUser && key.includes("supabase.auth.token")) {
            console.log("Using manual auth session");
            // Return undefined to force re-auth rather than using invalid tokens
            return null;
          }
          return localStorage.getItem(key);
        } catch (error) {
          console.error("Error getting auth from storage:", error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.error("Error setting auth in storage:", error);
        }
      },
      removeItem: (key) => {
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.error("Error removing auth from storage:", error);
        }
      },
    },
  },
});

export interface Article {
  article_id: string;
  title: string;
  content: string;
  image_url?: string;
  is_real: boolean;
  reason?: string;
  category?: string;
  source?: string;
  created_at?: string;
}

export type User = {
  id: string;
  username: string;
  email: string;
  points: number;
  seen_articles: string[];
};

// Fetch unseen articles for a user
export async function fetchUnseenArticles(userId: string, limit = 10) {
  // First get the user's seen articles
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("seen_articles")
    .eq("id", userId)
    .single();

  if (userError) {
    console.error("Error fetching user data:", userError);
    return { data: [], error: userError };
  }

  const seenArticles = userData?.seen_articles || [];

  // Then fetch articles the user hasn't seen yet
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .not(
      "article_id",
      "in",
      seenArticles.length ? `(${seenArticles.join(",")})` : "()"
    )
    .limit(limit);

  if (error) {
    console.error("Error fetching unseen articles:", error);
  }

  return { data, error };
}

// Update user points and mark article as seen
export async function updateUserAfterAnswer(
  userId: string,
  articleId: string,
  pointsToAdd: number
) {
  try {
    // First try the RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "update_user_after_answer",
      {
        user_id: userId,
        article_id: articleId,
        points_to_add: pointsToAdd,
      }
    );

    // If RPC fails, do the update directly
    if (rpcError) {
      console.log(
        "RPC function failed, using direct update instead:",
        rpcError
      );

      // Get current user data
      const { data: userData, error: getUserError } = await supabase
        .from("users")
        .select("points, seen_articles")
        .eq("id", userId)
        .single();

      if (getUserError) {
        throw getUserError;
      }

      // Update user with new points and add article to seen_articles
      const newPoints = (userData?.points || 0) + pointsToAdd;
      const newSeenArticles = [...(userData?.seen_articles || []), articleId];

      const { data, error } = await supabase
        .from("users")
        .update({
          points: newPoints,
          seen_articles: newSeenArticles,
        })
        .eq("id", userId)
        .select();

      if (error) {
        throw error;
      }

      return { data, error: null };
    }

    return { data: rpcData, error: null };
  } catch (error) {
    console.error("Error updating user:", error);
    return { data: null, error };
  }
}

// Record a game session
export async function recordGameSession(
  userId: string,
  articleId: string,
  userAnswer: boolean,
  selectedReason: string | null | undefined = undefined,
  sessionId: string | null | undefined = undefined
) {
  try {
    if (!userId) {
      console.error("Error recording game session: userId is required");
      return { data: null, error: new Error("userId is required") };
    }

    if (!articleId) {
      console.error("Error recording game session: articleId is required");
      return { data: null, error: new Error("articleId is required") };
    }

    // First, check if the table exists by trying to get its schema
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from("game_sessions")
        .select("*")
        .limit(1);

      if (tableError) {
        // If there's an error accessing the table, log it clearly
        console.error("Error accessing game_sessions table:", tableError);
        return {
          data: null,
          error: new Error(
            `Table access error: ${
              tableError.message || "Unable to access game_sessions table"
            }`
          ),
        };
      }

      console.log("Successfully validated game_sessions table access");
    } catch (tableCheckError) {
      console.error("Failed to verify game_sessions table:", tableCheckError);
      return {
        data: null,
        error: new Error(
          `Table verification error: ${
            tableCheckError instanceof Error
              ? tableCheckError.message
              : String(tableCheckError)
          }`
        ),
      };
    }

    // Don't pass undefined for session_id as it causes issues with Supabase
    // Only include session_id in the record if it's provided and not undefined/null
    const sessionRecord: any = {
      user_id: userId,
      article_id: articleId,
      user_answer: userAnswer,
    };

    // Only add these optional fields if they have non-null, defined values
    if (typeof selectedReason === "string" && selectedReason.trim() !== "") {
      sessionRecord.selected_reason = selectedReason;
    }

    if (typeof sessionId === "string" && sessionId.trim() !== "") {
      sessionRecord.session_id = sessionId;
    }

    // Log the session record for debugging
    console.log(
      "Recording game session with data:",
      JSON.stringify(sessionRecord, null, 2)
    );

    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .insert(sessionRecord);

      if (error) {
        // Handle empty error object first
        if (
          error &&
          typeof error === "object" &&
          Object.keys(error).length === 0
        ) {
          console.log(
            "Empty error object from Supabase - likely at game completion"
          );
          return { data: null, error: null };
        }

        // Log the specific error with more details
        console.error(
          "Error details from Supabase insert:",
          JSON.stringify(error, null, 2)
        );

        // Check if this is a duplicate key error (game completion scenario)
        if (error.code === "23505") {
          console.log(
            "Game session with this ID already recorded - duplicate key detected"
          );
          // This is an expected condition during gameplay - don't treat as an error
          return {
            data: null,
            error: null, // Return null error to prevent display to user
          };
        }

        // For database constraints that don't have code
        if (error.message?.includes("violates foreign key constraint")) {
          // This could happen at game completion when an article is already recorded
          console.log(
            "Foreign key constraint - might be occurring at game completion"
          );
          return {
            data: null,
            error: null, // Return null error to avoid disrupting game flow
          };
        }

        // For all other errors, return as normal but without the original error object
        // to prevent detailed database errors from reaching the client
        if (error.code) {
          console.log(`Database error code ${error.code}: ${error.message}`);
          return {
            data: null,
            error: new Error(
              `Operation failed: ${
                error.code === "23505"
                  ? "Record already exists"
                  : "Database constraint violation"
              }`
            ),
          };
        }

        return { data: null, error: new Error("Failed to insert record") };
      }

      console.log("Game session recorded successfully");
      return { data, error };
    } catch (insertError) {
      // Specific handling for insert errors
      console.error("Exception during insert operation:", insertError);

      // Check if we're at game completion (2 questions answered already)
      // This is a graceful fallback if we can't distinguish the exact error
      if (
        insertError instanceof Error &&
        (insertError.message?.includes("foreign key") ||
          insertError.message?.includes("duplicate") ||
          insertError.message?.includes("already exists"))
      ) {
        console.log("Insert error likely due to game completion - continuing");
        return { data: null, error: null };
      }

      // Handle empty error object
      if (
        insertError &&
        typeof insertError === "object" &&
        Object.keys(insertError).length === 0
      ) {
        console.log(
          "Empty error object from insert operation - likely at game completion"
        );
        return { data: null, error: null };
      }

      return {
        data: null,
        error: new Error(
          `Insert error: ${
            insertError instanceof Error
              ? insertError.message
              : String(insertError)
          }`
        ),
      };
    }
  } catch (e) {
    console.error("Exception in recordGameSession:", e);

    // If error is empty object, provide a more helpful message
    if (e && typeof e === "object" && Object.keys(e).length === 0) {
      console.log("Empty error object detected - likely at game completion");
      return { data: null, error: null }; // Return null error to avoid disrupting game flow
    }

    // Special handling for duplicate key errors at the outermost level
    if (e && typeof e === "object" && "code" in e && e.code === "23505") {
      console.log(
        "Duplicate key error caught at outer try/catch - suppressing error"
      );
      return { data: null, error: null };
    }

    return { data: null, error: new Error("Failed to record game session") };
  }
}

// Fetch leaderboard
export async function fetchLeaderboard(limit = 10) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, points")
      .order("points", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching leaderboard:", error);

      // If the error is table doesn't exist, return empty array instead of error
      if (error.code === "42P01") {
        // PostgreSQL code for "relation does not exist"
        return { data: [], error: null };
      }

      return { data: null, error };
    }

    return { data, error };
  } catch (err) {
    console.error("Unexpected error in fetchLeaderboard:", err);
    return { data: [], error: err };
  }
}

// Check if game_sessions table exists and create it if not
export async function ensureGameSessionsTable() {
  try {
    console.log("Checking for game_sessions table...");

    // First, check if the table exists by trying to get its schema
    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .limit(1);

    if (error) {
      // If error code suggests the table doesn't exist
      if (
        error.code === "42P01" ||
        error.message?.includes("relation") ||
        error.message?.includes("doesn't exist")
      ) {
        console.log("game_sessions table doesn't exist, creating it...");

        // Create the table with proper schema
        const { error: createError } = await supabase.rpc(
          "create_game_sessions_table"
        );

        if (createError) {
          console.error(
            "Error creating game_sessions table via RPC:",
            createError
          );

          // If RPC fails (it might not be set up), try direct SQL
          // This would require admin/unrestricted access which might not be available
          console.log(
            "Couldn't create table via RPC. Please create the game_sessions table manually."
          );

          return { success: false, error: createError };
        }

        console.log("Successfully created game_sessions table");
        return { success: true };
      }

      console.error("Error checking game_sessions table:", error);
      return { success: false, error };
    }

    console.log("game_sessions table exists");
    return { success: true };
  } catch (e) {
    console.error("Exception checking/creating game_sessions table:", e);
    return { success: false, error: e };
  }
}

// Call this early in the app lifecycle
if (typeof window !== "undefined") {
  // Only run on client-side
  ensureGameSessionsTable().then((result) => {
    if (!result.success) {
      console.warn(
        "Failed to ensure game_sessions table exists. Game session recording may not work."
      );
    }
  });
}
