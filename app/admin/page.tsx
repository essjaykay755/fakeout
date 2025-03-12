"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import NewsManagement from "@/components/admin/news-management";
import SessionTracking from "@/components/admin/session-tracking";
import RssGeneration from "@/components/admin/rss-generation";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("news");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.email === "essjaykay755@gmail.com") {
        setAuthorized(true);
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  if (loading || !authorized) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {["news", "sessions", "rss"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "news" && "News Management"}
                {tab === "sessions" && "User Sessions"}
                {tab === "rss" && "RSS Feed Generation"}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 border rounded-md">
        {activeTab === "news" && <NewsManagement />}
        {activeTab === "sessions" && <SessionTracking />}
        {activeTab === "rss" && <RssGeneration />}
      </div>
    </div>
  );
}
