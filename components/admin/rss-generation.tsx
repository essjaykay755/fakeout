"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Common news categories
const CATEGORIES = [
  "general",
  "business",
  "technology",
  "entertainment",
  "health",
  "science",
  "sports",
  "politics",
];

// Default RSS feeds for news categories
const DEFAULT_FEEDS = [
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    category: "general",
  },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "general" },
  {
    url: "https://feeds.skynews.com/feeds/rss/technology.xml",
    category: "technology",
  },
  { url: "https://www.wired.com/feed/rss", category: "technology" },
  {
    url: "http://rss.cnn.com/rss/edition_entertainment.rss",
    category: "entertainment",
  },
  { url: "https://www.health.harvard.edu/blog/feed", category: "health" },
  { url: "https://rss.sciencedaily.com/top.xml", category: "science" },
  { url: "https://www.espn.com/espn/rss/news", category: "sports" },
  {
    url: "https://feeds.skynews.com/feeds/rss/politics.xml",
    category: "politics",
  },
];

export default function RssGeneration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    realArticles?: number;
    fakeArticles?: number;
  } | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState("general");
  const [customFeeds, setCustomFeeds] = useState<
    Array<{ url: string; category: string }>
  >([]);
  const [generatingCustom, setGeneratingCustom] = useState(false);

  async function generateFromDefaultFeeds() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-from-rss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feeds: DEFAULT_FEEDS,
        }),
      });

      const data = await response.json();

      setResult({
        success: data.success,
        message: data.message,
        realArticles: data.realArticles,
        fakeArticles: data.fakeArticles,
      });
    } catch (error) {
      console.error("Error generating articles from RSS:", error);
      setResult({
        success: false,
        message: "Failed to generate articles from RSS feeds",
      });
    } finally {
      setLoading(false);
    }
  }

  function addCustomFeed() {
    if (!feedUrl.trim()) return;

    setCustomFeeds([...customFeeds, { url: feedUrl, category }]);
    setFeedUrl("");
  }

  function removeCustomFeed(index: number) {
    const newFeeds = [...customFeeds];
    newFeeds.splice(index, 1);
    setCustomFeeds(newFeeds);
  }

  async function generateFromCustomFeeds() {
    if (customFeeds.length === 0) return;

    setGeneratingCustom(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-from-rss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feeds: customFeeds,
        }),
      });

      const data = await response.json();

      setResult({
        success: data.success,
        message: data.message,
        realArticles: data.realArticles,
        fakeArticles: data.fakeArticles,
      });
    } catch (error) {
      console.error("Error generating articles from custom RSS:", error);
      setResult({
        success: false,
        message: "Failed to generate articles from custom RSS feeds",
      });
    } finally {
      setGeneratingCustom(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">RSS Feed Generation</h2>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="text-xl font-medium mb-4">
            Generate from Default Feeds
          </h3>
          <p className="mb-4 text-gray-600">
            Generate articles from our curated list of {DEFAULT_FEEDS.length}{" "}
            RSS feeds across various categories.
          </p>

          <div className="mt-4">
            <Button
              onClick={generateFromDefaultFeeds}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Generating..." : "Generate from Default Feeds"}
            </Button>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p className="font-medium">Default feeds include:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {DEFAULT_FEEDS.slice(0, 5).map((feed, index) => (
                <li key={index}>
                  {new URL(feed.url).hostname} ({feed.category})
                </li>
              ))}
              {DEFAULT_FEEDS.length > 5 && (
                <li>And {DEFAULT_FEEDS.length - 5} more feeds...</li>
              )}
            </ul>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-medium mb-4">Custom RSS Feeds</h3>

          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                RSS Feed URL
              </label>
              <Input
                placeholder="https://example.com/rss.xml"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={addCustomFeed} variant="outline" className="mt-2">
              Add Feed
            </Button>
          </div>

          {customFeeds.length > 0 && (
            <div className="mt-4 mb-6">
              <h4 className="font-medium mb-2">Added Feeds:</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {customFeeds.map((feed, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="truncate">{feed.url}</p>
                      <p className="text-xs text-gray-500">{feed.category}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCustomFeed(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                className="w-full mt-4"
                onClick={generateFromCustomFeeds}
                disabled={generatingCustom}
              >
                {generatingCustom
                  ? "Generating..."
                  : "Generate from Custom Feeds"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {result && (
        <Card
          className={`p-6 mt-8 ${result.success ? "bg-green-50" : "bg-red-50"}`}
        >
          <h3 className="text-xl font-medium mb-2">
            {result.success ? "Generation Complete" : "Generation Failed"}
          </h3>
          <p className="mb-2">{result.message}</p>
          {result.success && (
            <div className="flex gap-4 mt-4">
              <div className="bg-white p-3 rounded-md text-center flex-1">
                <p className="font-bold text-2xl">{result.realArticles}</p>
                <p className="text-sm text-gray-600">Real articles generated</p>
              </div>
              <div className="bg-white p-3 rounded-md text-center flex-1">
                <p className="font-bold text-2xl">{result.fakeArticles}</p>
                <p className="text-sm text-gray-600">Fake articles generated</p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
