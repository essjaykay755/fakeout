"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { fetchLeaderboard } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Create Badge component since it doesn't exist in the UI components yet
const Badge = ({
  children,
  variant,
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
  [key: string]: any;
}) => {
  const baseClasses =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
  const variantClasses =
    variant === "outline" ? "border" : "bg-primary text-primary-foreground";

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${className || ""}`}
      {...props}
    >
      {children}
    </span>
  );
};

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  points: number;
  created_at: string;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<"all" | "month" | "week">("all");
  const { toast } = useToast();

  useEffect(() => {
    const getLeaderboard = async () => {
      try {
        setLoading(true);
        const { data, error } = await fetchLeaderboard(20);

        if (error) throw error;

        if (data) {
          // Add missing properties for type safety if they don't exist
          const formattedData = data.map((entry: any) => ({
            id: entry.id || "",
            user_id: entry.user_id || "",
            username: entry.username || "",
            points: entry.points || 0,
            created_at: entry.created_at || new Date().toISOString(),
          })) as LeaderboardEntry[];

          setLeaderboardData(formattedData);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        toast({
          title: "Error",
          description: "Failed to load leaderboard. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    getLeaderboard();
  }, [toast]);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-500";
      case 1:
        return "bg-gray-300";
      case 2:
        return "bg-amber-600";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getRowStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-50";
      case 1:
        return "bg-gray-50";
      case 2:
        return "bg-amber-50";
      default:
        return "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Leaderboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how you stack up against other FakeOut players around the
              world. Can you make it to the top?
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-md shadow-sm">
              <Button
                variant={timeFrame === "all" ? "default" : "outline"}
                className="rounded-l-md rounded-r-none"
                onClick={() => setTimeFrame("all")}
              >
                All Time
              </Button>
              <Button
                variant={timeFrame === "month" ? "default" : "outline"}
                className="rounded-none border-l-0 border-r-0"
                onClick={() => setTimeFrame("month")}
              >
                This Month
              </Button>
              <Button
                variant={timeFrame === "week" ? "default" : "outline"}
                className="rounded-r-md rounded-l-none"
                onClick={() => setTimeFrame("week")}
              >
                This Week
              </Button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Top Players</CardTitle>
                    <CardDescription className="text-blue-100">
                      Based on total points earned
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-white border-white px-3 py-1"
                  >
                    {timeFrame === "all"
                      ? "All Time"
                      : timeFrame === "month"
                      ? "This Month"
                      : "This Week"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-16 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                    <p className="mt-4 text-gray-600">
                      Loading leaderboard data...
                    </p>
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-gray-600">
                      No leaderboard data available yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Rank
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Player
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {leaderboardData.map((entry, index) => (
                          <tr key={entry.id} className={getRowStyle(index)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span
                                  className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${getMedalColor(
                                    index
                                  )} text-white font-medium`}
                                >
                                  {index + 1}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                  {entry.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {entry.username}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Joined{" "}
                                    {new Date(
                                      entry.created_at
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="text-lg font-bold text-gray-900">
                                {entry.points}
                              </div>
                              <div className="text-xs text-gray-500">
                                total points
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-yellow-800">
                    Gold Medal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-yellow-500 rounded-full text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-yellow-800">
                      Awarded to players who score in the top position
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-gray-800">
                    Silver Medal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-gray-300 rounded-full text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-800">
                      Awarded to players who score in the second position
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-amber-800">
                    Bronze Medal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-amber-600 rounded-full text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-amber-800">
                      Awarded to players who score in the third position
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-4">
                Don't see your name on the leaderboard?
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => (window.location.href = "/play")}
              >
                Play Now to Rank Up
              </Button>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t bg-white py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} FakeOut. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="/about"
              className="text-sm text-muted-foreground hover:underline"
            >
              About
            </a>
            <a
              href="/privacy"
              className="text-sm text-muted-foreground hover:underline"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-muted-foreground hover:underline"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
