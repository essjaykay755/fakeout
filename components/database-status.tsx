"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArticleType,
  createGameSession,
  resetAllArticles,
} from "@/lib/supabase/functions";
import { supabase } from "@/lib/supabase";

interface DatabaseStatusProps {
  usingMockArticles: boolean;
  userId: string;
  onArticlesLoaded: (
    sessionId: string,
    articles: ArticleType[],
    resetGame: boolean
  ) => void;
}

export default function DatabaseStatus({
  usingMockArticles,
  userId,
  onArticlesLoaded,
}: DatabaseStatusProps) {
  // State for loading and debug info
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to initialize the database with sample data
  const initializeDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/setup-database");
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Database Initialized",
          description: data.message,
        });
        // Reload the session to get the new articles
        const sessionData = await createGameSession(userId);
        onArticlesLoaded(sessionData.id, sessionData.articles, true);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to initialize database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error initializing database:", error);
      toast({
        title: "Error",
        description: "Failed to initialize database. See console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch real news from NewsAPI and store in database
  const fetchRealNews = async () => {
    try {
      setLoading(true);
      setDebugInfo("Fetching real news from NewsAPI...");

      const categories = ["general", "technology", "science", "business"];
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];

      const response = await fetch(
        `/api/fetch-and-store-real-news?category=${randomCategory}&limit=10`
      );
      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Real News Added",
          description:
            data.message ||
            "Real news articles added to the database successfully!",
        });

        // Reload the session to get the new articles
        const sessionData = await createGameSession(userId);
        onArticlesLoaded(sessionData.id, sessionData.articles, true);

        setDebugInfo(
          (prev) =>
            `${prev}\n${data.message}\nAdded ${
              data.articles?.length || 0
            } real news articles.`
        );
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch and store real news",
          variant: "destructive",
        });
        setDebugInfo((prev) => `${prev}\nError: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching real news:", error);
      toast({
        title: "Error",
        description: "Failed to fetch real news. See console for details.",
        variant: "destructive",
      });
      setDebugInfo(
        (prev) =>
          `${prev}\nException: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Add a function to debug the database connection
  const debugConnection = async () => {
    try {
      setLoading(true);
      setDebugInfo("Testing database connection...");

      // Show environment info instead of trying to access internal properties
      setDebugInfo((prev) => `${prev}\nSupabase configured: ${!!supabase}`);

      // Test the connection with a simple query
      const { count, error } = await supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true });

      if (error) {
        setDebugInfo(
          (prev) => `${prev}\nConnection Error: ${JSON.stringify(error)}`
        );
      } else {
        setDebugInfo(
          (prev) => `${prev}\nConnection successful! Found ${count} articles.`
        );

        // Check the database table structure
        setDebugInfo((prev) => `${prev}\n\n--- Database Structure ---`);
        const { data: dbInfo, error: dbInfoError } = await supabase
          .rpc("get_db_info")
          .maybeSingle();

        if (dbInfoError) {
          setDebugInfo(
            (prev) =>
              `${prev}\nError getting DB info: ${JSON.stringify(dbInfoError)}`
          );

          // Alternative approach - get a sample record to see fields
          const { data: sampleArticle, error: sampleError } = await supabase
            .from("news_articles")
            .select("*")
            .limit(1)
            .single();

          if (sampleError) {
            setDebugInfo(
              (prev) =>
                `${prev}\nError getting sample article: ${JSON.stringify(
                  sampleError
                )}`
            );
          } else if (sampleArticle) {
            setDebugInfo(
              (prev) =>
                `${prev}\nTable columns: ${Object.keys(sampleArticle).join(
                  ", "
                )}`
            );
          }
        } else {
          setDebugInfo(
            (prev) => `${prev}\nDB Info: ${JSON.stringify(dbInfo, null, 2)}`
          );
        }

        // Check the user's seen articles
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("seen_articles")
          .eq("id", userId)
          .single();

        if (userError) {
          setDebugInfo(
            (prev) =>
              `${prev}\nError fetching user data: ${JSON.stringify(userError)}`
          );
        } else {
          const seenArticles = userData?.seen_articles || [];
          setDebugInfo(
            (prev) => `${prev}\nUser has seen ${seenArticles.length} articles.`
          );
          setDebugInfo(
            (prev) =>
              `${prev}\nSeen article IDs: ${JSON.stringify(seenArticles)}`
          );
        }

        // Get count of real and fake news articles
        const { data: realNewsData, error: realCountError } = await supabase
          .from("news_articles")
          .select("*")
          .eq("is_real", true);

        const { data: fakeNewsData, error: fakeCountError } = await supabase
          .from("news_articles")
          .select("*")
          .eq("is_real", false);

        if (!realCountError && !fakeCountError) {
          setDebugInfo(
            (prev) =>
              `${prev}\nReal news articles: ${realNewsData?.length || 0}`
          );
          setDebugInfo(
            (prev) =>
              `${prev}\nFake news articles: ${fakeNewsData?.length || 0}`
          );

          // Show the first few articles of each type for analysis
          if (realNewsData && realNewsData.length > 0) {
            setDebugInfo((prev) => `${prev}\n\n--- Real News Sample ---`);
            const sample = realNewsData[0];
            setDebugInfo((prev) => `${prev}\nID: ${sample.article_id}`);
            setDebugInfo(
              (prev) => `${prev}\nTitle: ${sample.title.substring(0, 50)}...`
            );
            setDebugInfo((prev) => `${prev}\nCategory: ${sample.category}`);
          }

          if (fakeNewsData && fakeNewsData.length > 0) {
            setDebugInfo((prev) => `${prev}\n\n--- Fake News Sample ---`);
            const sample = fakeNewsData[0];
            setDebugInfo((prev) => `${prev}\nID: ${sample.article_id}`);
            setDebugInfo(
              (prev) => `${prev}\nTitle: ${sample.title.substring(0, 50)}...`
            );
            setDebugInfo((prev) => `${prev}\nCategory: ${sample.category}`);
          }
        }
      }
    } catch (error) {
      setDebugInfo(
        `Debug Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to reset seen articles
  const resetSeenArticles = async () => {
    try {
      setLoading(true);
      setDebugInfo("Resetting seen articles...");

      // Use the improved resetAllArticles function
      const result = await resetAllArticles(userId);

      if (result.success) {
        toast({
          title: "Reset Complete",
          description:
            "Your seen articles have been reset. You should now see all articles again.",
        });

        // Reload the session to get the new articles
        const sessionData = await createGameSession(userId);
        onArticlesLoaded(sessionData.id, sessionData.articles, true);

        setDebugInfo(
          (prev) =>
            `${prev}\nArticles reset successfully! ${result.message || ""}`
        );
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reset seen articles",
          variant: "destructive",
        });
        setDebugInfo((prev) => `${prev}\nError: ${result.error}`);
      }
    } catch (error) {
      console.error("Error resetting seen articles:", error);
      toast({
        title: "Error",
        description: "Failed to reset seen articles. See console for details.",
        variant: "destructive",
      });
      setDebugInfo(
        (prev) =>
          `${prev}\nException: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-yellow-50 border-yellow-300">
      <CardHeader>
        <CardTitle className="text-yellow-800">Database Management</CardTitle>
        <CardDescription className="text-yellow-700">
          Add real and fake news articles to the database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-yellow-700 mb-4">
          You can add real news articles from NewsAPI or initialize the database
          with sample data.
        </p>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
          <Button
            onClick={fetchRealNews}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Fetching..." : "Fetch Real News"}
          </Button>
          <Button
            onClick={initializeDatabase}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {loading ? "Initializing..." : "Initialize Database with Samples"}
          </Button>
          <Button
            onClick={debugConnection}
            disabled={loading}
            variant="outline"
            className="border-yellow-600 text-yellow-700"
          >
            Debug Connection
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-yellow-700 mb-2">
            Having trouble seeing all articles?
          </p>
          <Button
            onClick={resetSeenArticles}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Resetting..." : "Reset Seen Articles"}
          </Button>
          <p className="text-xs text-yellow-600 mt-1">
            This will reset your history so you can see all articles again.
          </p>
        </div>

        {debugInfo && (
          <div className="mt-4 p-3 bg-white rounded border border-yellow-300 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-48">
            {debugInfo}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
