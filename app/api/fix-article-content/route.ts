import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { v4 as uuidv4 } from "uuid";

// This endpoint fixes article headline and content mismatches using Gemini
export async function POST(request: Request) {
  try {
    const { article_id, title, content, is_real, reason } =
      await request.json();

    // Check if we already have a fixed version of this article in the cache
    if (article_id) {
      const { data: existingCache, error: cacheError } = await supabase
        .from("article_content_cache")
        .select("*")
        .eq("original_article_id", article_id)
        .single();

      if (!cacheError && existingCache) {
        console.log(`Found cached fixed content for article ID: ${article_id}`);
        // Return the cached version
        return NextResponse.json({
          success: true,
          message: "Using cached fixed content",
          fixedTitle: existingCache.fixed_title,
          fixedContent: existingCache.fixed_content,
          fromCache: true,
        });
      }
    }

    // If no cache exists or article_id not provided, use Gemini to fix the content
    let fixedTitle = title;
    let fixedContent = content;
    let prompt = "";

    if (is_real) {
      // For real articles, we just want to make sure the content aligns with the headline
      prompt = `
I have a real news article with the following headline and content. Please rewrite BOTH the headline and content to make them match better while preserving the key facts. Keep the content to 3-4 concise sentences. Don't make up new facts.

Original Headline: "${title}"
Original Content: "${content}"

Respond in this format only:
Headline: [Fixed headline]
Content: [Fixed content]
`;
    } else {
      // For fake articles, we want to maintain the fake type while fixing the mismatch
      prompt = `
I have a fake news article with the following headline, content, and fake news type. Please rewrite BOTH the headline and content to better match each other while preserving the fake news type. Keep the content to 3-4 concise sentences.

Original Headline: "${title}"
Original Content: "${content}"
Fake News Type: "${reason || "General fake news"}"

Respond in this format only:
Headline: [Fixed headline that matches the fake news type]
Content: [Fixed content that matches both the headline and the fake news type in 3-4 sentences]
`;
    }

    // Call Gemini to fix the content
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
      maxTokens: 400,
      temperature: 0.7,
    });

    // Parse the response
    const headlineMatch = text.match(/Headline:\s*(.*?)(?:\n|$)/i);
    const contentMatch = text.match(/Content:\s*([\s\S]*)/i);

    if (headlineMatch && headlineMatch[1]) {
      fixedTitle = headlineMatch[1].trim();
    }

    if (contentMatch && contentMatch[1]) {
      fixedContent = contentMatch[1].trim();
    }

    // Store in cache if article_id was provided
    if (article_id) {
      const { error: insertError } = await supabase
        .from("article_content_cache")
        .insert({
          id: uuidv4(),
          original_article_id: article_id,
          original_title: title,
          original_content: content,
          fixed_title: fixedTitle,
          fixed_content: fixedContent,
          is_real: is_real,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error caching fixed content:", insertError);
      } else {
        console.log(`Cached fixed content for article ID: ${article_id}`);
      }
    }

    return NextResponse.json({
      success: true,
      fixedTitle,
      fixedContent,
      fromCache: false,
    });
  } catch (error) {
    console.error("Error fixing article content:", error);
    return NextResponse.json(
      { error: "Failed to fix article content" },
      { status: 500 }
    );
  }
}
