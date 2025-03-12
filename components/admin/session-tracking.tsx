"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GameSession {
  session_id: string;
  user_id: string;
  article_id: string;
  user_answer: boolean;
  selected_reason: string | null;
  timestamp: string;
  users?: {
    username: string;
    email: string;
  };
  news_articles?: {
    title: string;
    is_real: boolean;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  points: number;
  seen_articles: string[];
}

interface ArticleStats {
  article_id: string;
  title: string;
  view_count: number;
  correct_count: number;
  incorrect_count: number;
}

export default function SessionTracking() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalUsers: 0,
    totalArticlesShown: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
  });
  const [topArticles, setTopArticles] = useState<ArticleStats[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  useEffect(() => {
    fetchSessions();
    fetchUsers();
    fetchStats();
    fetchTopArticles();
  }, [page, userFilter, dateRange]);

  async function fetchSessions() {
    setLoading(true);
    try {
      // First, get the total count for pagination
      let countQuery = supabase
        .from("game_sessions")
        .select("*", { count: "exact", head: true });

      if (userFilter) {
        countQuery = countQuery.eq("user_id", userFilter);
      }

      // Apply date range filter if selected
      if (dateRange !== "all") {
        const now = new Date();
        let startDate = new Date();

        if (dateRange === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === "week") {
          startDate.setDate(now.getDate() - 7);
        } else if (dateRange === "month") {
          startDate.setMonth(now.getMonth() - 1);
        }

        countQuery = countQuery.gte("timestamp", startDate.toISOString());
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error("Error fetching session count:", countError);
      } else {
        // Calculate total pages
        const total = count || 0;
        const pages = Math.max(1, Math.ceil(total / pageSize));
        setTotalPages(pages);

        // Adjust current page if it's out of bounds
        if (page >= pages && pages > 0) {
          setPage(pages - 1);
          return; // Exit early as the page state change will trigger a re-fetch
        }
      }

      // Now fetch the sessions for the current page
      let query = supabase
        .from("game_sessions")
        .select(
          `
          *,
          users (username, email),
          news_articles (title, is_real)
        `
        )
        .order("timestamp", { ascending: false });

      if (userFilter) {
        query = query.eq("user_id", userFilter);
      }

      // Apply date range filter if selected
      if (dateRange !== "all") {
        const now = new Date();
        let startDate = new Date();

        if (dateRange === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateRange === "week") {
          startDate.setDate(now.getDate() - 7);
        } else if (dateRange === "month") {
          startDate.setMonth(now.getMonth() - 1);
        }

        query = query.gte("timestamp", startDate.toISOString());
      }

      // Apply pagination
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching sessions:", error);
      } else {
        setSessions(data || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("username");

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  async function fetchStats() {
    try {
      // Get total number of sessions
      const { count: sessionCount, error: sessionError } = await supabase
        .from("game_sessions")
        .select("*", { count: "exact", head: true });

      // Get total number of unique users who have played
      const { count: userCount, error: userError } = await supabase
        .from("game_sessions")
        .select("user_id", { count: "exact", head: true })
        .is("user_id", "not.null");

      // Get total number of unique articles shown
      const { count: articleCount, error: articleError } = await supabase
        .from("game_sessions")
        .select("article_id", { count: "exact", head: true })
        .is("article_id", "not.null");

      // Get correct vs incorrect answers
      const { data: correctData, error: correctError } = await supabase
        .from("game_sessions")
        .select("user_answer, news_articles!inner(is_real)")
        .limit(1000); // Limiting to 1000 for performance

      let correct = 0;
      let incorrect = 0;

      if (correctData) {
        correctData.forEach((session: any) => {
          if (session.user_answer === session.news_articles.is_real) {
            correct++;
          } else {
            incorrect++;
          }
        });
      }

      setStats({
        totalSessions: sessionCount || 0,
        totalUsers: userCount || 0,
        totalArticlesShown: articleCount || 0,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  async function fetchTopArticles() {
    try {
      // Get view count for each article
      const { data, error } = await supabase
        .from("game_sessions")
        .select(
          `
          article_id,
          news_articles!inner(title, is_real),
          user_answer
        `
        )
        .limit(500); // Limiting to 500 for performance

      if (data) {
        // Process the data to get view counts and correct/incorrect counts
        const articleMap = new Map<string, ArticleStats>();

        data.forEach((session: any) => {
          const articleId = session.article_id;
          const isCorrect =
            session.user_answer === session.news_articles.is_real;

          if (!articleMap.has(articleId)) {
            articleMap.set(articleId, {
              article_id: articleId,
              title: session.news_articles.title,
              view_count: 1,
              correct_count: isCorrect ? 1 : 0,
              incorrect_count: isCorrect ? 0 : 1,
            });
          } else {
            const article = articleMap.get(articleId)!;
            article.view_count += 1;
            if (isCorrect) {
              article.correct_count += 1;
            } else {
              article.incorrect_count += 1;
            }
          }
        });

        // Convert to array and sort by view count
        const articlesArray = Array.from(articleMap.values());
        articlesArray.sort((a, b) => b.view_count - a.view_count);

        setTopArticles(articlesArray.slice(0, 5)); // Get top 5
      }
    } catch (error) {
      console.error("Error fetching top articles:", error);
    }
  }

  // Filter sessions by search query
  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      session.users?.username.toLowerCase().includes(query) ||
      session.users?.email.toLowerCase().includes(query) ||
      session.news_articles?.title.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Game Session Tracking</h2>

      {/* Statistics Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Game Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.totalSessions}
            </div>
            <div className="text-sm text-gray-600">1. Total Sessions</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.totalUsers}
            </div>
            <div className="text-sm text-gray-600">2. Total Players</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {stats.totalArticlesShown}
            </div>
            <div className="text-sm text-gray-600">3. Articles Shown</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.correctAnswers}
            </div>
            <div className="text-sm text-gray-600">4. Correct Answers</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {stats.incorrectAnswers}
            </div>
            <div className="text-sm text-gray-600">5. Incorrect Answers</div>
          </Card>
        </div>

        {/* Top Articles Section */}
        <h3 className="text-lg font-medium mt-8 mb-4">
          Top 5 Most Viewed Articles
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  6. Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  7. Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  8. Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  9. Correct
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  10. Incorrect
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topArticles.map((article, index) => (
                <tr key={article.article_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {article.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {article.view_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">
                    {article.correct_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                    {article.incorrect_count}
                  </td>
                </tr>
              ))}
              {topArticles.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="md:w-1/3"
        />

        <select
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPage(0); // Reset to first page when changing filter
          }}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username} ({user.email})
            </option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value as "all" | "today" | "week" | "month");
            setPage(0); // Reset to first page when changing date range
          }}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-8">No sessions found</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Article</th>
                  <th className="px-4 py-2 text-center">User Answer</th>
                  <th className="px-4 py-2 text-center">Correct</th>
                  <th className="px-4 py-2 text-center">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => {
                  const isCorrect =
                    session.user_answer === session.news_articles?.is_real;
                  return (
                    <tr
                      key={session.session_id}
                      className={`border-t ${
                        isCorrect ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {session.users?.username || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.users?.email || "No email"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {session.news_articles?.title || "Unknown Article"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {session.user_answer ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Fake
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            Real
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isCorrect ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {new Date(session.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>

              {/* Jump to page select */}
              {totalPages > 2 && (
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={page}
                  onChange={(e) => {
                    setPage(Number(e.target.value));
                  }}
                >
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
