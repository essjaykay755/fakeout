"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/components/auth-provider";
import { Header } from "@/components/header";
import {
  FeedbackType,
  ArticleType,
  submitAnswer,
  generateMoreArticles,
  getGameSession,
  createGameSession,
  resetAllArticles,
} from "@/lib/supabase/functions";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Award,
  Clock,
  BarChart,
  Globe,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import DatabaseStatus from "@/components/database-status";
import { supabase } from "@/lib/supabase";

interface Article {
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

export default function PlayGame() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, boolean>>({});
  const [selectedReason, setSelectedReason] = useState<string | undefined>(
    undefined
  );
  const [score, setScore] = useState(0);
  const [feedbackData, setFeedbackData] = useState<{
    article_id: string;
    is_fake: boolean;
    reason?: string;
    explanation?: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<
    {
      articleId: string;
      title: string;
      isCorrect: boolean;
      userAnswer: boolean;
      actualValue: boolean;
      timestamp: string;
    }[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [articleStats, setArticleStats] = useState({
    real: 0,
    fake: 0,
    totalScore: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    incorrect: 0,
  });

  // Add local tracking for articles we've answered in this session
  const [localSeenArticles, setLocalSeenArticles] = useState<string[]>([]);

  // Fake news categories with their descriptions for the UI
  const reasonOptions = [
    {
      value: "misleading_headline",
      label: "Misleading Headline",
      description:
        "The headline makes claims not supported by the article content",
    },
    {
      value: "factual_errors",
      label: "Factual Errors",
      description:
        "The article contains false information that can be fact-checked",
    },
    {
      value: "opinion_as_fact",
      label: "Opinion as Fact",
      description:
        "Presents opinions or judgments as if they were objective facts",
    },
    {
      value: "lack_of_sources",
      label: "Lack of Sources",
      description: "Information is presented without credible sources",
    },
    {
      value: "conspiracy_theory",
      label: "Conspiracy Theory",
      description:
        "Promotes an explanation that connects unrelated events with insufficient evidence",
    },
    {
      value: "outdated_information",
      label: "Outdated Information",
      description: "Contains information that is no longer accurate",
    },
    {
      value: "satire_or_parody",
      label: "Satire or Parody",
      description:
        "Content is meant to be humorous but might be interpreted as factual",
    },
    {
      value: "seems_trustworthy",
      label: "Seems Trustworthy",
      description:
        "I believe this is real news based on credible sources and accurate information",
    },
  ];

  useEffect(() => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to play the game.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    const loadSession = async () => {
      setInitialLoading(true);
      try {
        // Try to get an existing session
        const sessionData = await getGameSession(user.id);

        if (
          sessionData &&
          sessionData.articles &&
          sessionData.articles.length > 0
        ) {
          setSessionId(sessionData.id);
          setArticles(sessionData.articles);
          setScore(sessionData.score || 0);

          // If there are answers stored, restore the user's progress
          if (
            sessionData.answers &&
            Object.keys(sessionData.answers).length > 0
          ) {
            setUserAnswers(sessionData.answers);
            setCurrentArticleIndex(Object.keys(sessionData.answers).length);
          }

          updateStats(sessionData.articles, sessionData.answers || {});
        } else {
          // Create a new session with articles
          const newSession = await createGameSession(user.id);
          setSessionId(newSession.id);
          setArticles(newSession.articles);
        }

        // Load previous session history
        fetchSessionHistory();
      } catch (error) {
        console.error("Error loading game session:", error);
        toast({
          title: "Error",
          description: "Could not load game session. Please try again.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    loadSession();
  }, [user, router, toast]);

  // Function to fetch user's session history
  const fetchSessionHistory = async () => {
    if (!user) return;

    setLoadingHistory(true);
    try {
      // Fetch the user's recent game sessions
      const { data, error } = await supabase
        .from("game_sessions")
        .select(
          `
          session_id,
          article_id,
          user_answer,
          timestamp,
          news_articles(title, is_real)
        `
        )
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(50); // Get the 50 most recent sessions

      if (error) {
        console.error("Error fetching session history:", error);
        return;
      }

      if (data && data.length > 0) {
        const history = data.map((session: any) => ({
          articleId: session.article_id,
          title: session.news_articles?.title || "Unknown Article",
          isCorrect: session.user_answer === session.news_articles?.is_real,
          userAnswer: session.user_answer,
          actualValue: session.news_articles?.is_real,
          timestamp: session.timestamp,
        }));

        setSessionHistory(history);
      }
    } catch (error) {
      console.error("Error in fetchSessionHistory:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const updateStats = (
    articles: Article[],
    answers: Record<string, boolean>
  ) => {
    const stats = {
      real: 0,
      fake: 0,
      totalScore: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      incorrect: 0,
    };

    // Count real vs fake articles
    articles.forEach((article) => {
      if (article.is_fake) {
        stats.fake++;
      } else {
        stats.real++;
      }
    });

    // Calculate stats based on answers
    let currentStreak = 0;

    Object.entries(answers).forEach(([articleId, userAnswer]) => {
      const article = articles.find((a) => a.id === articleId);
      if (article) {
        const isCorrect = userAnswer === article.is_fake;

        if (isCorrect) {
          stats.correct++;
          stats.totalScore += 10;
          currentStreak++;
          stats.bestStreak = Math.max(stats.bestStreak, currentStreak);
        } else {
          stats.incorrect++;
          currentStreak = 0;
        }
      }
    });

    stats.streak = currentStreak;
    setArticleStats(stats);
  };

  const handleSubmitAnswer = async (answer: boolean) => {
    if (!sessionId || currentArticleIndex >= articles.length) return;

    try {
      setLoading(true);
      const currentArticle = articles[currentArticleIndex];

      // Store the user's answer
      const newAnswers = { ...userAnswers };
      newAnswers[currentArticle.id] = answer;
      setUserAnswers(newAnswers);

      // Add to local tracking immediately
      setLocalSeenArticles((prev) => [...prev, currentArticle.id]);

      // Submit answer to backend
      const result = await submitAnswer(
        sessionId,
        user?.id || "anonymous",
        currentArticle.id,
        answer,
        selectedReason ? selectedReason : undefined
      );

      // Update feedback data with null check
      if (result && result.feedback) {
        setFeedbackData(result.feedback);

        // Show feedback
        setShowFeedback(true);

        // Update score and stats
        if (result.feedback.is_fake === answer) {
          // Correct answer
          setScore(score + 10);
        }
      } else {
        toast({
          title: "Error",
          description: result?.message || "Could not process your answer",
          variant: "destructive",
        });
      }

      // Update stats
      updateStats(articles, newAnswers);
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast({
        title: "Error",
        description: "Failed to submit your answer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextArticle = () => {
    setShowFeedback(false);
    setShowExplanation(false);

    // If we're at the end of available articles
    if (currentArticleIndex >= articles.length - 1) {
      setGameOver(true);
      return;
    }

    // Otherwise, move to the next article
    setCurrentArticleIndex((prev) => prev + 1);
  };

  // Add a function to initialize the database with sample data
  const initializeDatabase = async () => {
    try {
      setInitialLoading(true);
      const response = await fetch("/api/setup-database");
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Database Initialized",
          description: data.message,
        });
        // Reload the session to get the new articles
        if (user) {
          const sessionData = await createGameSession(user.id);
          setSessionId(sessionData.id);
          setArticles(sessionData.articles);
          setCurrentArticleIndex(0);
          setUserAnswers({});
          setGameOver(false);
        }
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
      setInitialLoading(false);
    }
  };

  // Add a function to reset seen articles
  const resetSeenArticles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Use the improved resetAllArticles function
      const result = await resetAllArticles(user.id);

      if (!result.success) {
        console.error("Error resetting seen articles:", result.error);
        toast({
          title: "Error",
          description:
            result.error || "Could not reset seen articles. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (result.warning) {
        console.warn("Warning during reset:", result.warning);
      }

      // Clear local tracking too
      setLocalSeenArticles([]);
      toast({
        title: "Reset Complete",
        description:
          "Your seen articles list has been reset. Refreshing game...",
      });

      // Force refresh the application state
      setGameOver(false);

      // Create a new session with fresh articles
      try {
        const newSession = await createGameSession(user.id);

        if (
          newSession &&
          newSession.articles &&
          newSession.articles.length > 0
        ) {
          console.log(
            "Successfully loaded new articles after reset:",
            newSession.articles.length,
            "articles loaded"
          );

          // Count real and fake news
          const realCount = newSession.articles.filter(
            (a) => !a.is_fake
          ).length;
          const fakeCount = newSession.articles.filter((a) => a.is_fake).length;
          console.log(
            `Loaded ${realCount} real and ${fakeCount} fake news articles`
          );

          setSessionId(newSession.id);
          setArticles(newSession.articles);
          setCurrentArticleIndex(0);
          setUserAnswers({});
        } else {
          console.error("No articles returned after reset:", newSession);
          toast({
            title: "Warning",
            description:
              "Reset completed but no articles could be loaded. Try refreshing the page.",
            variant: "destructive",
          });
        }
      } catch (sessionError) {
        console.error("Error creating new session after reset:", sessionError);
        toast({
          title: "Error",
          description:
            "Failed to load new articles after reset. Please refresh the page.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error in resetSeenArticles:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while resetting your game.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoreArticles = async () => {
    if (!user || !sessionId) return;

    setLoading(true);
    try {
      console.log("Attempting to fetch more articles for user:", user.id);
      console.log("Current session ID:", sessionId);

      // Debug current seen articles before fetching more
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("seen_articles")
          .eq("id", user.id)
          .single();

        console.log(
          "User's seen articles before fetch:",
          userData?.seen_articles || []
        );
      } catch (debugErr) {
        console.error("Error checking seen articles:", debugErr);
      }

      const result = await generateMoreArticles(sessionId, user.id);

      console.log("Result from generateMoreArticles:", result);

      if (result && result.articles && result.articles.length > 0) {
        setArticles((prev) => [...prev, ...result.articles]);
        setGameOver(false);
        toast({
          title: "New Articles",
          description: `Loaded ${result.articles.length} more articles successfully!`,
        });
      } else if (result && result.success === false) {
        // Handle explicit failure case
        toast({
          title: "No Articles",
          description:
            result.error || "No more articles available at the moment.",
          variant: "destructive",
        });
      } else {
        // Handle empty result
        toast({
          title: "No Articles",
          description:
            "No more articles available at the moment. Please check back later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating more articles:", error);

      // More detailed error message to help debug
      let errorMessage = "Could not load more articles.";
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
        console.error("Stack trace:", error.stack);
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Don't provide mock articles, show error state
      setArticles([]);
      setGameOver(true);
      toast({
        title: "No Articles Available",
        description:
          "Could not retrieve articles from the database. Please check again later when administrators have added content.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const restartGame = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create a new session
      const newSession = await createGameSession(user.id);

      // Check if there's a message (which means all articles have been seen)
      if (newSession.message) {
        // Set an empty array of articles
        setArticles([]);
        setGameOver(true);

        // Display the message to the user
        toast({
          title: "No New Articles",
          description: newSession.message,
        });
      } else {
        // Reset all game state
        setSessionId(newSession.id);
        setArticles(newSession.articles);
        setCurrentArticleIndex(0);
        setUserAnswers({});
        setScore(0);
        setFeedbackData(null);
        setGameOver(false);

        // Reset stats
        updateStats(newSession.articles, {});

        toast({
          title: "New Game",
          description: "Started a new game with fresh articles!",
        });
      }
    } catch (error) {
      console.error("Error restarting game:", error);
      toast({
        title: "Error",
        description: "Could not start a new game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get the current article
  const currentArticle = articles[currentArticleIndex];
  const totalArticlesAnswered = Object.keys(userAnswers).length;
  const progressPercentage =
    articles.length > 0 ? (totalArticlesAnswered / articles.length) * 100 : 0;

  // Determine if answer was correct for feedback
  const wasCorrect = feedbackData
    ? userAnswers[feedbackData.article_id] === feedbackData.is_fake
    : false;

  // Generate custom feedback message based on our own wasCorrect value
  const customFeedbackMessage = wasCorrect
    ? "Good job! You correctly identified this article."
    : "Sorry, that's not correct. Keep practicing!";

  // Handler for when new articles are loaded from the database status component
  const handleArticlesLoaded = (
    newSessionId: string,
    newArticles: ArticleType[],
    resetGame: boolean
  ) => {
    setSessionId(newSessionId);
    setArticles(newArticles);
    if (resetGame) {
      setCurrentArticleIndex(0);
      setUserAnswers({});
      setGameOver(false);
    }
  };

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);

        // Check if Supabase is initialized before trying to use it
        if (!supabase) {
          console.error("Supabase client is not initialized");
          toast({
            title: "Database Error",
            description:
              "Database connection is not available. Please refresh the page.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const gameSession = await getGameSession(user?.id || "anonymous");

        if (!gameSession) {
          console.error("Failed to get game session");
          toast({
            title: "Error",
            description: "Could not start game session",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // If we have a message, it means we've seen all articles
        if (gameSession.message) {
          toast({
            title: "Notice",
            description: gameSession.message,
          });
          setArticles([]);
          setLoading(false);
          setGameOver(true);
          return;
        }

        // Filter out any articles that we've already locally tracked as seen
        const filteredArticles = gameSession.articles.filter(
          (article) => !localSeenArticles.includes(article.id)
        );

        console.log(
          "Original articles from server:",
          gameSession.articles.length
        );
        console.log("After local filtering:", filteredArticles.length);

        if (filteredArticles.length === 0 && gameSession.articles.length > 0) {
          // If all articles were filtered out but we had articles from the server,
          // there might be a sync issue - force a new session
          console.log(
            "All articles filtered out locally, creating new session"
          );
          const newSession = await createGameSession(user?.id || "anonymous");

          // Check if new session has a message (all articles seen)
          if (newSession.message) {
            toast({
              title: "Notice",
              description: newSession.message,
            });
            setArticles([]);
            setLoading(false);
            setGameOver(true);
            return;
          }

          // Filter the new session's articles too
          const newFilteredArticles = newSession.articles.filter(
            (article) => !localSeenArticles.includes(article.id)
          );

          if (newFilteredArticles.length === 0) {
            // If still no articles, we've really seen them all
            toast({
              title: "Notice",
              description:
                "You've seen all available articles. We'll reset your seen articles list.",
            });

            // Reset local tracking
            setLocalSeenArticles([]);
            setArticles(newSession.articles);
          } else {
            setArticles(newFilteredArticles);
          }

          setSessionId(newSession.id);
        } else {
          setArticles(filteredArticles);
          setSessionId(gameSession.id);
        }

        setUserAnswers({});
        setCurrentArticleIndex(0);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching articles:", error);

        // Check for specific error types to provide better user feedback
        let errorMessage = "Failed to load articles";
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
          console.error("Error details:", error.stack);
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });

        // Don't provide mock articles, show error state
        setArticles([]);
        setGameOver(true);
        toast({
          title: "No Articles Available",
          description:
            "Could not retrieve articles from the database. Please check again later when administrators have added content.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    if (user) {
      fetchArticles();
    }
  }, [user, localSeenArticles]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <div className="container max-w-4xl mx-auto pt-10 pb-20 px-4">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
            <p className="mt-6 text-lg text-gray-600">
              Loading your game session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container max-w-4xl mx-auto pt-10 pb-20 px-4">
        {/* Game Header with stats */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              FakeOut Challenge
            </h1>
            <p className="text-gray-600 mt-1">
              Can you spot the fake news? Test your media literacy skills.
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 rounded-full p-2 mb-1">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">Score</span>
              <span className="font-bold text-blue-600">{score}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-2 mb-1">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Correct</span>
              <span className="font-bold text-green-600">
                {articleStats.correct}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-red-100 rounded-full p-2 mb-1">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm text-gray-600">Wrong</span>
              <span className="font-bold text-red-600">
                {articleStats.incorrect}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(true)}
            >
              <BarChart className="h-4 w-4 mr-1" />
              Stats
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Article {currentArticleIndex + 1} of {articles.length}
            </span>
            <span>{progressPercentage.toFixed(0)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col">
          {initialLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading articles...</p>
              </div>
            </div>
          ) : gameOver ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                  No Articles Available
                </h2>
                <p className="text-gray-600 text-center mb-6">
                  There are currently no more articles available to view.
                  Articles are managed by administrators and will be added
                  periodically. Please check back later.
                </p>
                <div className="flex flex-col gap-3 items-center">
                  <Button
                    onClick={restartGame}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    Check Again
                  </Button>
                  <Button
                    onClick={resetSeenArticles}
                    variant="outline"
                    disabled={loading}
                  >
                    Reset Seen Articles
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Main game area when playing
            <div className="container max-w-4xl p-6">
              <div className="flex justify-between mb-6">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">Spot the Fake News</h1>
                  <p className="text-gray-500">
                    Article {currentArticleIndex + 1} of {articles.length}
                  </p>
                </div>

                {/* Add History Button */}
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(true)}
                    className="flex items-center"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    History
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStats(true)}
                    className="flex items-center"
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    Stats
                  </Button>
                </div>
              </div>

              {currentArticle && (
                <Card className="mb-6 border-0 shadow-lg">
                  <CardHeader className="bg-white rounded-t-lg border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {currentArticle.title}
                        </CardTitle>
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <span className="font-medium">
                            {currentArticle.publisher}
                          </span>
                          <span className="mx-2">•</span>
                          <span>
                            {new Date(
                              currentArticle.published_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => setShowExplanation(!showExplanation)}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        {showExplanation ? "Hide Tips" : "Show Tips"}
                      </Button>
                    </div>

                    {showExplanation && (
                      <Alert className="mt-3 bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">
                          How to evaluate this article
                        </AlertTitle>
                        <AlertDescription className="text-blue-700 text-sm mt-1">
                          <ul className="list-disc pl-4 space-y-1">
                            <li>
                              Check if the headline matches the actual content
                            </li>
                            <li>Look for cited sources and references</li>
                            <li>
                              Consider if claims are verified by multiple
                              outlets
                            </li>
                            <li>Be wary of emotionally charged language</li>
                            <li>
                              Check the publisher's reputation and credibility
                            </li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardHeader>

                  <CardContent className="px-6 py-6">
                    <div className="prose prose-blue max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentArticle.content,
                        }}
                      />

                      <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-600">
                        <p className="italic">
                          By {currentArticle.author}
                          {currentArticle.url && (
                            <span>
                              {" "}
                              •{" "}
                              {new URL(currentArticle.url).hostname.replace(
                                "www.",
                                ""
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-gray-50 rounded-b-lg border-t flex flex-col space-y-6 py-6">
                    <div className="w-full text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Is this article fake news?
                      </h3>
                      <div className="flex justify-center gap-6">
                        <Button
                          variant="outline"
                          size="lg"
                          className="bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 hover:border-red-300 px-8"
                          onClick={() => handleSubmitAnswer(true)}
                          disabled={loading}
                        >
                          <ThumbsDown className="h-5 w-5 mr-2" />
                          Fake News
                        </Button>

                        <Button
                          variant="outline"
                          size="lg"
                          className="bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700 hover:border-green-300 px-8"
                          onClick={() => handleSubmitAnswer(false)}
                          disabled={loading}
                        >
                          <ThumbsUp className="h-5 w-5 mr-2" />
                          Real News
                        </Button>
                      </div>
                    </div>

                    <div className="w-full">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        Why do you think so? (Optional)
                      </h3>
                      <RadioGroup
                        value={selectedReason}
                        onValueChange={setSelectedReason}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3"
                      >
                        {reasonOptions.map((option) => (
                          <div
                            key={option.value}
                            className="flex items-start space-x-2 border border-gray-200 rounded-md p-3 hover:bg-gray-50"
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={option.value}
                              className="flex-1 cursor-pointer"
                            >
                              <span className="font-medium text-gray-800">
                                {option.label}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {option.description}
                              </p>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </CardFooter>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {wasCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              {wasCorrect ? "Correct!" : "Incorrect"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {customFeedbackMessage}
            </DialogDescription>
          </DialogHeader>

          {feedbackData && (
            <div className="py-4">
              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <h4 className="font-medium mb-2 text-gray-900">
                  Article Facts:
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="font-medium text-gray-700 mr-2">
                      Status:
                    </span>
                    <span
                      className={`${
                        feedbackData.is_fake ? "text-red-600" : "text-green-600"
                      } font-semibold`}
                    >
                      {feedbackData.is_fake ? "Fake News" : "Real News"}
                    </span>
                  </li>
                  {feedbackData.reason && (
                    <li className="flex items-start">
                      <span className="font-medium text-gray-700 mr-2">
                        Reason:
                      </span>
                      <span>{feedbackData.reason}</span>
                    </li>
                  )}
                  {feedbackData.explanation && (
                    <li className="flex items-start">
                      <span className="font-medium text-gray-700 mr-2">
                        Explanation:
                      </span>
                      <span>{feedbackData.explanation}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button type="button" onClick={handleNextArticle}>
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Game Statistics</DialogTitle>
            <DialogDescription>
              Your current game performance and statistics
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {score}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Score
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {totalArticlesAnswered}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Articles Completed
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {articleStats.streak}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Current Streak
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {articleStats.bestStreak}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Best Streak
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex flex-col items-center justify-center">
                    <div className="text-xl font-bold">
                      {articleStats.correct === 0 &&
                      articleStats.incorrect === 0
                        ? 0
                        : Math.round(
                            (articleStats.correct /
                              (articleStats.correct + articleStats.incorrect)) *
                              100
                          )}
                      %
                    </div>
                    <div className="text-xs text-gray-600">Accuracy</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Article Types
                    </h3>
                    <div className="flex items-center mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${
                              articles.length > 0
                                ? (articleStats.real / articles.length) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-green-600">
                        {articleStats.real} Real
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{
                            width: `${
                              articles.length > 0
                                ? (articleStats.fake / articles.length) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-red-600">
                        {articleStats.fake} Fake
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Performance
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center text-green-600 mb-1">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Correct</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {articleStats.correct}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center text-red-600 mb-1">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Incorrect</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {articleStats.incorrect}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setShowStats(false)}>
              Back to Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Game History</DialogTitle>
            <DialogDescription>
              Your last 50 article interactions
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : sessionHistory.length === 0 ? (
            <div className="text-center py-6">
              <p>No game history available yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Play more articles to build your history.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium border-b pb-2">
                <div className="w-1/2">Article</div>
                <div className="w-1/4 text-center">Your Answer</div>
                <div className="w-1/4 text-center">Result</div>
              </div>

              {sessionHistory.map((session, index) => (
                <div
                  key={`${session.articleId}-${index}`}
                  className={`flex items-center text-sm border-b pb-2 ${
                    session.isCorrect ? "text-green-700" : "text-red-700"
                  }`}
                >
                  <div className="w-1/2 truncate font-medium">
                    {session.title}
                    <div className="text-xs text-gray-500">
                      {new Date(session.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="w-1/4 text-center">
                    {session.userAnswer ? "Fake" : "Real"}
                    {session.actualValue !== session.userAnswer && (
                      <div className="text-xs">
                        (Actually {session.actualValue ? "Real" : "Fake"})
                      </div>
                    )}
                  </div>
                  <div className="w-1/4 text-center">
                    {session.isCorrect ? (
                      <CheckCircle className="inline h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="inline h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => fetchSessionHistory()}
              disabled={loadingHistory}
            >
              Refresh History
            </Button>
            <Button onClick={() => setShowHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add database status checker if mock articles are being used */}
      {!initialLoading && user && (
        <div className="space-y-4">
          {/* Database Status Component */}
          <DatabaseStatus
            usingMockArticles={false}
            userId={user.id}
            onArticlesLoaded={handleArticlesLoaded}
          />
        </div>
      )}
    </div>
  );
}
