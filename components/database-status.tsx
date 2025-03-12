"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArticleType, createGameSession } from "@/lib/supabase/functions";

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
  const [loading, setLoading] = useState(false);
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

  if (!usingMockArticles) {
    return null;
  }

  return (
    <Card className="p-6 bg-yellow-50 border-yellow-300">
      <CardHeader>
        <CardTitle className="text-yellow-800">Mock Articles in Use</CardTitle>
        <CardDescription className="text-yellow-700">
          You're seeing mock articles because there are no real articles in the
          database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-yellow-700 mb-4">
          To see real articles, you need to initialize the database with sample
          data or add articles through the admin panel.
        </p>
        <Button
          onClick={initializeDatabase}
          disabled={loading}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          {loading ? "Initializing..." : "Initialize Database with Samples"}
        </Button>
      </CardContent>
    </Card>
  );
}
