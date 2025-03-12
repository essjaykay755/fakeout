import type { Article } from "@/lib/supabase";
import Image from "next/image";
import { useState, useEffect } from "react";

interface NewsArticleProps {
  article: Article;
}

export function NewsArticle({ article }: NewsArticleProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fixedTitle, setFixedTitle] = useState<string | null>(null);
  const [fixedContent, setFixedContent] = useState<string | null>(null);
  const [fixingContent, setFixingContent] = useState(false);

  // Use a fallback image if none is provided
  let imageUrl =
    article.image_url || "https://via.placeholder.com/800x400?text=No+Image";

  // Clean up image URLs that might have low quality params
  if (imageUrl) {
    // Remove quality and strip parameters that might be causing issues
    imageUrl = imageUrl
      .replace(/quality=\d+/g, "quality=100")
      .replace(/strip=all/g, "")
      .replace(/&?crop=\d+,\d+,\d+,\d+/g, "");

    // Remove HTML entity encoding for ampersands
    imageUrl = imageUrl.replace(/&#038;/g, "&");

    // Fix double ampersands
    imageUrl = imageUrl.replace(/&&/g, "&");
  }

  // Determine if we should use unoptimized mode
  // This helps with external domains not in the config
  const isExternalDomain =
    !imageUrl.includes("via.placeholder.com") &&
    !imageUrl.includes("platform.theverge.com") &&
    !imageUrl.includes("i2.cdn.turner.com");

  // Clean up the content by removing HTML tags
  const cleanContent = article.content
    ? article.content
        .replace(/<\/?[^>]+(>|$)/g, "") // Remove HTML tags
        .replace(/&[#\w]+;/g, "") // Remove HTML entities
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
    : "";

  // Ensure content ends with proper punctuation and doesn't get cut off mid-sentence
  const ensureCompleteContent = (content: string) => {
    if (!content) return "";

    // If content already ends with punctuation, return it
    if (
      content.endsWith(".") ||
      content.endsWith("!") ||
      content.endsWith("?")
    ) {
      return content;
    }

    // Find the last sentence that ends with proper punctuation
    const lastPeriodIndex = Math.max(
      content.lastIndexOf("."),
      content.lastIndexOf("!"),
      content.lastIndexOf("?")
    );

    // If we found a sentence end, return up to that point
    if (lastPeriodIndex !== -1) {
      return content.substring(0, lastPeriodIndex + 1);
    }

    // If no proper sentence ending found, add a period
    return content + ".";
  };

  // Apply the content cleanup
  const finalContent = fixedContent || ensureCompleteContent(cleanContent);
  const finalTitle = fixedTitle || article.title;

  // Check if title and content might be mismatched
  useEffect(() => {
    // Skip if we've already fixed content or are in the process
    if (fixedContent || fixingContent || !article.article_id) return;

    // Basic heuristic to check for potential mismatch
    const needsFixing =
      // Check if the title contains certain patterns from satire/parody
      article.title.includes("Leads to Discovery of Aliens") ||
      // Check if title has BREAKING but content doesn't seem to match
      (article.title.includes("BREAKING") &&
        !cleanContent.includes("revolutionary")) ||
      // Check for other common mismatches
      (article.title.includes("Change") && !cleanContent.includes("change")) ||
      // Check if title and content seem very disconnected
      (!article.is_real &&
        !cleanContent
          .toLowerCase()
          .includes(
            article.title
              .toLowerCase()
              .split(" ")
              .slice(1, 3)
              .join(" ")
              .toLowerCase()
          ));

    // Only fix when needed
    if (needsFixing) {
      const fixArticleContent = async () => {
        try {
          setFixingContent(true);
          const response = await fetch("/api/fix-article-content", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              article_id: article.article_id,
              title: article.title,
              content: cleanContent,
              is_real: article.is_real,
              reason: article.reason,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setFixedTitle(data.fixedTitle);
              setFixedContent(data.fixedContent);
              console.log(
                `Fixed content for article ${article.article_id}${
                  data.fromCache ? " (from cache)" : ""
                }`
              );
            }
          }
        } catch (error) {
          console.error("Error fixing article content:", error);
        } finally {
          setFixingContent(false);
        }
      };

      fixArticleContent();
    }
  }, [article, cleanContent, fixedContent, fixingContent]);

  // Simulate loading delay and set loading to false
  useEffect(() => {
    setIsLoading(true);

    // Timer to ensure we don't show the skeleton forever if image events don't fire
    const maxLoadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Maximum 3 seconds of loading

    // Timer to ensure minimum skeleton display time
    const minLoadingTimer = setTimeout(() => {
      if (imageLoaded || imageError) {
        setIsLoading(false);
      }
    }, 500); // Minimum skeleton display time

    return () => {
      clearTimeout(minLoadingTimer);
      clearTimeout(maxLoadingTimer);
    };
  }, [imageLoaded, imageError]);

  // Image loading handlers
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-200" />
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-64 w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={finalTitle || "News article"}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
          quality={100}
          unoptimized={isExternalDomain || imageUrl.includes("placeholder.com")}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold">{finalTitle}</h3>
        <p className="text-gray-600 text-base">{finalContent}</p>
      </div>
    </div>
  );
}
