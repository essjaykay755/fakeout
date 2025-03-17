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
  SubmitAnswerResponse,
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
  reason?: string;
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
    reason?: string | null;
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
  const [showFakeNewsTypeSelector, setShowFakeNewsTypeSelector] =
    useState(false);
  const [pendingFakeNews, setPendingFakeNews] = useState(false);
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

  // Add a new state for article transitions
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Add an initial setup state to prevent article flashing at startup
  const [isInitialSetup, setIsInitialSetup] = useState(true);

  // Fake news types from the about page
  const fakeNewsTypes = [
    "False Claims",
    "Misleading Headlines",
    "Out of Context",
    "Satire or Parody",
    "Impersonation",
    "Manipulated Content",
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

    // Complete rewrite of the game initialization logic
    const loadSession = async () => {
      try {
        setInitialLoading(true);
        setIsInitialSetup(true);

        // First clear any existing articles to prevent flashing
        setArticles([]);

        // Get session data
        const sessionData = await getGameSession(user.id);

        if (!sessionData) {
          throw new Error("Failed to get game session");
        }

        // Handle case where all articles have been seen
        if (sessionData.message) {
          setGameOver(true);
          toast({
            title: "Notice",
            description: sessionData.message,
          });
          setInitialLoading(false);
          setIsInitialSetup(false);
          setLoading(false);
          return;
        }

        // IMPORTANT: Set the current article index to 0 BEFORE setting articles
        // This prevents the issue of multiple articles showing during initialization
        setCurrentArticleIndex(0);

        // Set session ID first
        setSessionId(sessionData.id);

        // Keep initial loading state active until we're completely ready
        if (
          sessionData.answers &&
          Object.keys(sessionData.answers).length > 0
        ) {
          setUserAnswers(sessionData.answers);
          updateStats(sessionData.articles, sessionData.answers);
          setScore(sessionData.score || 0);

          // Wait for all state updates to process before continuing
          setTimeout(() => {
            // Only after everything else is set, update the current index
            setCurrentArticleIndex(Object.keys(sessionData.answers).length);

            // Finally set the articles
            setTimeout(() => {
              setArticles(sessionData.articles);

              // After a delay to ensure rendering is complete
              setTimeout(() => {
                setInitialLoading(false);
                setIsInitialSetup(false);
                setLoading(false);
              }, 100);
            }, 50);
          }, 100);
        } else {
          // Start from the beginning - simpler case
          setUserAnswers({});
          setScore(0);
          updateStats(sessionData.articles, {});

          // Wait briefly to ensure all state is processed
          setTimeout(() => {
            // Then set articles
            setArticles(sessionData.articles);

            // After a delay to ensure rendering is complete
            setTimeout(() => {
              setInitialLoading(false);
              setIsInitialSetup(false);
              setLoading(false);
            }, 100);
          }, 100);
        }

        // Load session history in the background
        fetchSessionHistory();
      } catch (error) {
        console.error("Error loading game session:", error);
        toast({
          title: "Error",
          description: "Could not load game session. Please try again.",
          variant: "destructive",
        });
        setInitialLoading(false);
        setIsInitialSetup(false);
        setLoading(false);
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

  const handleSubmitAnswer = async (answer: boolean, fakeNewsType?: string) => {
    // Debug log to help troubleshoot
    console.log(
      "handleSubmitAnswer called with answer:",
      answer ? "Fake" : "Real",
      fakeNewsType ? `and type: ${fakeNewsType}` : ""
    );
    console.log("Current state:", {
      sessionId,
      currentArticleIndex,
      articlesLength: articles.length,
      loading,
      isTransitioning,
    });

    // Prevent multiple submissions while processing
    if (
      !sessionId ||
      currentArticleIndex >= articles.length ||
      loading ||
      isTransitioning
    ) {
      console.log(
        "Answer submission blocked - already processing or invalid state"
      );
      return;
    }

    // If the user selects "Fake News" and no type is provided, show the selector dialog
    if (answer === true && !fakeNewsType) {
      setPendingFakeNews(true);
      setShowFakeNewsTypeSelector(true);
      return;
    }

    try {
      setLoading(true);
      const currentArticle = articles[currentArticleIndex];

      if (!currentArticle) {
        console.error("No current article found at index", currentArticleIndex);
        setLoading(false);
        toast({
          title: "Error",
          description: "Could not find the current article. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log("Current article:", {
        id: currentArticle.id,
        title: currentArticle.title,
        is_fake: currentArticle.is_fake,
      });

      // Store the user's answer locally regardless of backend success
      const newAnswers = { ...userAnswers };
      newAnswers[currentArticle.id] = answer;
      setUserAnswers(newAnswers);

      // Always provide feedback, even if backend fails
      const isCorrect = answer === currentArticle.is_fake;
      const localFeedback = {
        article_id: currentArticle.id,
        is_fake: currentArticle.is_fake,
        reason: fakeNewsType,
        explanation: isCorrect
          ? "You correctly identified this article."
          : "This was " + (currentArticle.is_fake ? "fake" : "real") + " news.",
        message: isCorrect
          ? "Good job! You correctly identified this article."
          : "Sorry, that's not correct. Keep practicing!",
      };

      // Try to submit to backend
      let backendSubmitSucceeded = false;

      console.log(
        `Submitting answer '${answer ? "Fake" : "Real"}' for article ${
          currentArticle.id
        }`
      );

      try {
        // Submit answer to backend with timeout protection
        const submitPromise = submitAnswer(
          sessionId,
          user?.id || "anonymous",
          currentArticle.id,
          answer,
          fakeNewsType ? fakeNewsType : undefined
        );

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Backend submission timed out")),
            5000
          );
        });

        // Race the submit against the timeout
        const result = (await Promise.race([
          submitPromise,
          timeoutPromise,
        ])) as SubmitAnswerResponse;

        console.log("Answer submission result:", result);

        if (result.error) {
          console.error("Error from submitAnswer:", result.error);
          throw new Error(result.error.toString());
        }

        // If we got feedback from backend, use it
        if (result.feedback) {
          setFeedbackData(result.feedback);
          backendSubmitSucceeded = true;
        }
      } catch (backendError) {
        console.error("Backend submission failed:", backendError);
        // Fall back to local feedback if backend fails
        backendSubmitSucceeded = false;
      }

      // If backend failed, use local feedback
      if (!backendSubmitSucceeded) {
        setFeedbackData(localFeedback);
        toast({
          title: "Connection Issue",
          description:
            "Saved your answer locally, but couldn't connect to the server.",
          variant: "default",
        });
      }

      // Always show feedback and update score
      setShowFeedback(true);

      // Update score based on correct identification
      let pointsEarned = 0;
      if (isCorrect) {
        // Basic points for correct identification
        pointsEarned = 10;

        // If they correctly identified fake news, check if type is correct
        if (answer && currentArticle.is_fake) {
          // Get the actual reason from the article
          const articleReason = currentArticle.reason || "";

          // Check if the user selected the correct fake news type
          if (fakeNewsType && articleReason.includes(fakeNewsType)) {
            // Extra points for correct type
            pointsEarned += 5;
            toast({
              title: "Bonus Points!",
              description:
                "You correctly identified the type of fake news (+5 points)",
            });
          }
        }

        setScore(score + pointsEarned);
      }

      // Update stats based on local data
      updateStats(articles, newAnswers);

      // Check if this was the last article
      if (currentArticleIndex >= articles.length - 1) {
        console.log("Last article answered, setting game over");
        setGameOver(true);
        toast({
          title: "Game Completed",
          description: "You've completed all available articles!",
        });
      }
    } catch (error) {
      console.error("Exception in handleSubmitAnswer:", error);
      toast({
        title: "Error",
        description:
          "An unexpected error occurred, but your answer was recorded locally.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSelectedReason(undefined); // Reset reason selection for next article
    }
  };

  // Handle article transitions with improved control flow
  const handleNextArticle = () => {
    // First set transitioning state to show loader instead of article content
    setIsTransitioning(true);

    // Close dialogs
    setShowFeedback(false);
    setShowExplanation(false);

    // Get the current article ID that we just answered
    const currentArticle = articles[currentArticleIndex];

    // Track seen articles
    if (currentArticle && !localSeenArticles.includes(currentArticle.id)) {
      setLocalSeenArticles((prev) => [...prev, currentArticle.id]);
    }

    // If we're at the end of available articles
    if (currentArticleIndex >= articles.length - 1) {
      console.log("Reached end of available articles, setting game over");

      // First close the dialog properly, then set game over
      setTimeout(() => {
        setGameOver(true);
        setIsTransitioning(false);

        // Show message to user with current progress
        toast({
          title: "All Articles Completed",
          description: `You've completed ${localSeenArticles.length} of ${totalExpectedArticles} articles. Use 'Reset Seen Articles' to play again.`,
        });
      }, 50);

      return;
    }

    // Use a controlled, sequential update approach
    // First clear article display with transition state, then update the index
    setTimeout(() => {
      // Move to the next article
      setCurrentArticleIndex((prev) => prev + 1);

      // Wait a bit more before showing the new article to ensure rendering is complete
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 100);
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
          setSessionId(sessionData.id || null);
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

          setSessionId(newSession.id || null);
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

  const handleFakeNewsTypeSelect = async (type: string) => {
    setSelectedReason(type);
    setShowFakeNewsTypeSelector(false);

    if (pendingFakeNews) {
      setPendingFakeNews(false);

      // Increased delay to ensure the dialog is fully closed before proceeding
      // This helps prevent race conditions with state updates
      setTimeout(async () => {
        await handleSubmitAnswer(true, type);
      }, 200);
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

      // Type safety for the result
      interface MoreArticlesResult {
        success: boolean;
        articles: Article[];
        error?: string;
        message?: string;
      }

      const result = (await generateMoreArticles(
        sessionId,
        user.id
      )) as unknown as MoreArticlesResult;

      console.log("Result from generateMoreArticles:", result);

      if (result && result.articles && result.articles.length > 0) {
        setArticles((prev) => [...prev, ...(result.articles || [])]);
        setGameOver(false);
        toast({
          title: "New Articles",
          description: `Loaded ${result.articles.length} more articles successfully!`,
        });
      } else {
        // Safely handle result properties
        const errorMessage = result?.error || "Could not load more articles";
        console.error("Failed to generate more articles:", errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
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
      // When restarting with a small database, reset local tracking
      // This ensures we clear any locally tracked "seen" articles
      setLocalSeenArticles([]);

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
        setSessionId(newSession.id || null);
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

  // Changed progress calculation to track the total articles seen (both local and from user answers)
  // This ensures the progress shows correct percentage even when fewer than 10 articles are available
  const totalArticlesAnswered = Object.keys(userAnswers).length;
  const totalExpectedArticles = 10; // Total expected articles in a full game
  const totalArticlesSeen = localSeenArticles.length;

  // Calculate progress based on seen articles out of expected total (10)
  const progressPercentage = (totalArticlesSeen / totalExpectedArticles) * 100;

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
    setSessionId(newSessionId || null);
    setArticles(newArticles);
    if (resetGame) {
      setCurrentArticleIndex(0);
      setUserAnswers({});
      setGameOver(false);
    }
  };

  if (initialLoading || isInitialSetup) {
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
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              {/* Update to show articles seen out of expected total */}
              {totalArticlesSeen} of {totalExpectedArticles} Articles
            </span>
            <span>{progressPercentage.toFixed(0)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col">
          {initialLoading || isInitialSetup ? (
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
                  {totalArticlesSeen > 0 && (
                    <span className="font-medium">
                      {" "}
                      You've seen {totalArticlesSeen} out of{" "}
                      {totalExpectedArticles} total articles.
                    </span>
                  )}
                  {totalArticlesSeen === 0 && (
                    <span>
                      {" "}
                      Articles are managed by administrators and will be added
                      periodically. Please check back later.
                    </span>
                  )}
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

              {currentArticle && !isTransitioning ? (
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
                      {/* Debug states */}
                      <div className="mt-4 p-2 bg-gray-100 text-xs">
                        <p>Debug - Loading: {loading ? "true" : "false"}</p>
                        <p>
                          Debug - Transitioning:{" "}
                          {isTransitioning ? "true" : "false"}
                        </p>
                        <button
                          onClick={() => {
                            setLoading(false);
                            setIsTransitioning(false);
                            toast({
                              description: "Reset loading states",
                            });
                          }}
                          className="px-2 py-1 bg-blue-100 rounded mt-1"
                        >
                          Reset States
                        </button>
                      </div>

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
                          onClick={() => {
                            toast({
                              description: "Submitting your answer...",
                            });
                            handleSubmitAnswer(true);
                          }}
                          disabled={loading || isTransitioning}
                        >
                          <ThumbsDown className="h-5 w-5 mr-2" />
                          Fake News
                        </Button>

                        <Button
                          variant="outline"
                          size="lg"
                          className="bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700 hover:border-green-300 px-8"
                          onClick={() => {
                            console.log("Real News button clicked");
                            // Force immediate UI feedback even before backend response
                            toast({
                              title: "Processing",
                              description: "Submitting your answer...",
                            });
                            handleSubmitAnswer(false);
                          }}
                          disabled={loading || isTransitioning}
                        >
                          <ThumbsUp className="h-5 w-5 mr-2" />
                          Real News
                        </Button>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ) : isTransitioning ? (
                <div className="flex justify-center items-center h-96">
                  <div className="w-8 h-8 border-t-4 border-blue-600 border-solid rounded-full animate-spin"></div>
                </div>
              ) : null}
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

      {/* Fake News Type Selector Dialog */}
      <Dialog
        open={showFakeNewsTypeSelector}
        onOpenChange={(open) => {
          if (!open) {
            // Clear the state when dialog is closed directly
            setShowFakeNewsTypeSelector(false);
            setPendingFakeNews(false);
            // Also ensure loading and transitioning states are reset if dialog is closed without selection
            setLoading(false);
            setIsTransitioning(false);
            // No longer transitioning if dialog closed without selection
            setIsTransitioning(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600">
              Select Fake News Type
            </DialogTitle>
            <DialogDescription>
              What type of fake news do you think this is?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fakeNewsTypes.map((type) => (
              <Button
                key={type}
                variant="outline"
                className="justify-start text-left hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-gray-200 p-4 rounded-md transition-all"
                onClick={() => handleFakeNewsTypeSelect(type)}
              >
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-red-500 rounded-full mr-3"></div>
                  <span className="font-medium">{type}</span>
                </div>
              </Button>
            ))}
          </div>
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
