import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
// Using placeholder values for development if environment variables are not set
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
  selectedReason?: string,
  sessionId?: string
) {
  const { data, error } = await supabase.from("game_sessions").insert({
    session_id: sessionId || undefined, // Use the provided session ID or let the database generate one
    user_id: userId,
    article_id: articleId,
    user_answer: userAnswer,
    selected_reason: selectedReason,
  });

  if (error) {
    console.error("Error recording game session:", error);
  }

  return { data, error };
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
