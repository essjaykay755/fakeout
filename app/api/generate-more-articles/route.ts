import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import Parser from "rss-parser";

// This endpoint generates more articles when we're running low
export async function GET(request: Request) {
  try {
    console.log("Generate more articles endpoint called");

    // First, check how many articles we already have
    const { count, error: countError } = await supabase
      .from("news_articles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking article count:", countError);
      throw countError;
    }

    console.log(`Current article count: ${count || 0}`);

    // If we have enough articles, return early
    // Lower this threshold to generate more articles more frequently
    if (count && count > 30) {
      return NextResponse.json({
        message: "Sufficient articles available",
        count,
      });
    }

    // We'll use a simpler and more direct approach to fetch RSS feeds
    let realArticles: any[] = [];

    try {
      // Initialize the parser - direct approach without the complex utils
      const parser = new Parser({
        customFields: {
          item: [
            "media:content",
            "content",
            "content:encoded",
            "enclosure",
            "description",
            "summary",
          ],
        },
      });

      // Use reliable feed sources
      const feedUrls = [
        { url: "https://www.theverge.com/rss/index.xml", name: "The Verge" },
        {
          url: "http://rss.cnn.com/rss/edition_technology.rss",
          name: "CNN Tech",
        },
      ];

      // Choose one feed to try first
      const selectedFeed =
        feedUrls[Math.floor(Math.random() * feedUrls.length)];
      console.log(
        `Attempting to fetch from ${selectedFeed.name} at ${selectedFeed.url}`
      );

      // Fetch with timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Fetch timeout for ${selectedFeed.name}`)),
          10000 // Extend timeout to 10 seconds
        )
      );

      // Fetch the RSS feed
      const fetchPromise = parser.parseURL(selectedFeed.url).then((feed) => {
        console.log(
          `Successfully fetched ${feed.items?.length || 0} items from ${
            selectedFeed.name
          }`
        );

        if (!feed.items || feed.items.length === 0) {
          console.log(`No items found in the feed from ${selectedFeed.name}`);
          return [];
        }

        // Process and format the articles
        return feed.items.slice(0, 8).map((item) => {
          console.log(`Processing item: ${item.title}`);

          // Extract image if available
          let imageUrl = null;

          try {
            // Try different image extraction methods
            if (item["media:content"]?.$.url) {
              imageUrl = item["media:content"].$.url;
              console.log(`Found media:content image: ${imageUrl}`);
            } else if (item.enclosure?.url) {
              imageUrl = item.enclosure.url;
              console.log(`Found enclosure image: ${imageUrl}`);
            } else {
              const content =
                item["content:encoded"] ||
                item.content ||
                item.description ||
                "";
              const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
              if (imgMatch && imgMatch[1]) {
                imageUrl = imgMatch[1];
                console.log(`Found image in content: ${imageUrl}`);
              }
            }

            // Clean up image URLs if necessary
            if (imageUrl) {
              // Remove low quality parameters and fix any problematic characters
              imageUrl = imageUrl
                .replace(/quality=\d+/g, "quality=100")
                .replace(/strip=all/g, "")
                .replace(/&?crop=\d+,\d+,\d+,\d+/g, "")
                .replace(/&#038;/g, "&")
                .replace(/&&/g, "&")
                .replace(/\s/g, "%20"); // Replace spaces with %20

              // Make sure URLs are properly encoded
              try {
                // Parse and reformat the URL to ensure it's well-formed
                const urlObj = new URL(imageUrl);
                imageUrl = urlObj.toString();
              } catch (urlError) {
                console.log(`Error parsing URL ${imageUrl}, using as is`);
              }
            }
          } catch (imgError) {
            console.error("Error extracting image:", imgError);
          }

          // Use a placeholder if no image was found
          if (!imageUrl) {
            console.log("No image found, using placeholder");
            imageUrl = "https://via.placeholder.com/800x400?text=News+Article";
          }

          // Extract content with a fallback
          const content = (
            item["content:encoded"] ||
            item.content ||
            item.contentSnippet ||
            item.summary ||
            item.description ||
            "No content available"
          ).slice(0, 500);

          return {
            article_id: uuidv4(),
            title: item.title || "Untitled Article",
            content: content,
            image_url: imageUrl,
            category: "technology",
            is_real: true,
            reason: null,
            created_at: new Date().toISOString(),
          };
        });
      });

      // Race between fetch and timeout
      try {
        console.log("Awaiting fetchPromise or timeout...");
        realArticles = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as any[];
        console.log(
          `Successfully processed ${realArticles.length} real articles`
        );
      } catch (raceError) {
        console.error("Error in Promise.race:", raceError);
        throw raceError;
      }
    } catch (rssError) {
      console.error("Error fetching RSS feed:", rssError);
      console.log("Using fallback content instead");

      // Use fallback real articles
      realArticles = [
        {
          article_id: uuidv4(),
          title: "Scientists Discover New Species in Amazon Rainforest",
          content:
            "Researchers from the University of Brazil have discovered a new species of frog in the Amazon rainforest. The species, dubbed 'Dendrobates azureus amazonia', is characterized by its bright blue coloring and unique mating call.",
          image_url:
            "https://via.placeholder.com/800x400?text=Amazon+Rainforest+Frog",
          is_real: true,
          category: "science",
          created_at: new Date().toISOString(),
          reason: null,
        },
        {
          article_id: uuidv4(),
          title: "New Cancer Treatment Shows Promise in Clinical Trials",
          content:
            "A new immunotherapy treatment for pancreatic cancer has shown promising results in phase III clinical trials. The treatment, developed by researchers at Stanford University, increased 5-year survival rates by 40%.",
          image_url: "https://via.placeholder.com/800x400?text=Cancer+Research",
          is_real: true,
          category: "health",
          created_at: new Date().toISOString(),
          reason: null,
        },
        {
          article_id: uuidv4(),
          title: "AI Models Can Now Generate Life-Saving Medicines",
          content:
            "Researchers at MIT have demonstrated that AI models can now generate novel molecular structures for potential medicines with unprecedented accuracy. The system has already identified several promising candidates for treating rare diseases.",
          image_url: "https://via.placeholder.com/800x400?text=AI+Medicine",
          is_real: true,
          category: "technology",
          created_at: new Date().toISOString(),
          reason: null,
        },
      ];
    }

    console.log("Starting to create fake articles");

    // Now create fake articles with Gemini API
    const fakeReasons = [
      "False Claim",
      "Misleading Headline",
      "Out of Context",
      "Satire or Parody",
      "Manipulated Content",
      "Conspiracy Theory",
    ];

    // Generate fake articles using Gemini API
    const fakeArticlePromises = realArticles
      .slice(0, 4)
      .map(async (realArticle) => {
        try {
          // Choose a fake news reason
          const reason =
            fakeReasons[Math.floor(Math.random() * fakeReasons.length)];

          // Determine category from the real article
          const category = realArticle.category || "technology";

          // Call our Gemini-powered fake news generator
          const response = await fetch(
            `${new URL(request.url).origin}/api/generate-fake-news`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                category,
                fakeType: reason,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(
              `Gemini API request failed with status ${response.status}`
            );
          }

          const fakeNewsData = await response.json();

          return {
            article_id: uuidv4(),
            title: fakeNewsData.title,
            content: fakeNewsData.content,
            image_url: realArticle.image_url,
            category,
            is_real: false,
            reason,
            created_at: new Date().toISOString(),
          };
        } catch (error) {
          console.error("Error generating fake article with Gemini:", error);

          // Fallback to the rule-based approach if Gemini fails
          const reason =
            fakeReasons[Math.floor(Math.random() * fakeReasons.length)];

          // Create a fake version with appropriate modifications
          let fakeTitle = realArticle.title;
          let fakeContent = realArticle.content;

          // Apply different transformations based on the reason
          switch (reason) {
            case "False Claim":
              fakeTitle = fakeTitle.replace(
                /discovered|found|developed|announced|confirmed/i,
                "failed to prove"
              );
              fakeContent = `Contrary to widespread claims, ${fakeContent.toLowerCase()}`;
              break;

            case "Misleading Headline":
              fakeTitle = `BREAKING: Revolutionary ${fakeTitle} Changes Everything We Know`;
              // Content remains similar
              break;

            case "Out of Context":
              fakeContent = `In a completely unrelated context, ${fakeContent}. Experts agree this has major implications for completely different fields.`;
              break;

            case "Satire or Parody":
              fakeTitle = `${fakeTitle} Leads to Discovery of Aliens Living Among Us`;
              fakeContent = `In a twist no one saw coming, ${fakeContent}. Scientists are now convinced this is proof of extraterrestrial life.`;
              break;

            case "Manipulated Content":
              fakeContent = fakeContent.replace(
                /increase|decrease|improve|reduce/gi,
                (word: string) => {
                  const opposites: Record<string, string> = {
                    increase: "decrease",
                    decrease: "increase",
                    improve: "worsen",
                    reduce: "amplify",
                  };
                  return opposites[word.toLowerCase()] || word;
                }
              );
              break;

            case "Conspiracy Theory":
              fakeTitle = `The Truth They Don't Want You to Know: ${fakeTitle}`;
              fakeContent = `Government insiders have revealed that ${fakeContent}. This information has been suppressed for decades.`;
              break;
          }

          return {
            article_id: uuidv4(),
            title: fakeTitle,
            content: fakeContent,
            image_url: realArticle.image_url,
            category: realArticle.category,
            is_real: false,
            reason: reason,
            created_at: new Date().toISOString(),
          };
        }
      });

    // Wait for all fake articles to be generated
    const fakeArticles = await Promise.all(fakeArticlePromises);

    // Add some additional fake articles if needed
    if (fakeArticles.length < 3) {
      console.log("Adding backup fake articles");

      // Define some backup fake articles with better matching headlines and content
      const backupFakeArticles = [
        {
          category: "health",
          reason: "False Claim",
          title: "COVID Vaccine Causes Third Arm Growth in Florida Man",
          content:
            "A 45-year-old man from Florida claims to have grown a third arm after receiving his second dose of the COVID-19 vaccine. Medical experts dismiss the claim as physically impossible, noting that no such side effect has ever been documented.",
        },
        {
          category: "technology",
          reason: "Satire or Parody",
          title: "Apple Unveils iSleep Pod That Replaces Human Need for Sleep",
          content:
            "Apple has announced the iSleep Pod, a revolutionary device that supposedly eliminates the human need for sleep. The $4,999 pod allegedly recharges the human body in just 10 minutes, though scientists remain skeptical of these claims.",
        },
        {
          category: "politics",
          reason: "Conspiracy Theory",
          title:
            "Government Hiding Evidence of Alien Technology in White House Basement",
          content:
            "According to anonymous sources, the government has been hiding recovered alien technology in a secret White House basement facility. Officials have consistently denied these claims, calling them 'completely fabricated and without merit.'",
        },
      ];

      // Try to use our content fixing endpoint to improve these backup articles
      try {
        const promises = backupFakeArticles.map(async (article) => {
          try {
            // Call our API to get optimized content
            const response = await fetch(
              `${new URL(request.url).origin}/api/fix-article-content`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: article.title,
                  content: article.content,
                  is_real: false,
                  reason: article.reason,
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                // Use the optimized content if available
                return {
                  article_id: uuidv4(),
                  title: data.fixedTitle,
                  content: data.fixedContent,
                  image_url: `https://via.placeholder.com/800x400?text=${encodeURIComponent(
                    article.category
                  )}`,
                  is_real: false,
                  category: article.category,
                  created_at: new Date().toISOString(),
                  reason: article.reason,
                };
              }
            }
            // Fall back to the original if optimization fails
            throw new Error("Optimization failed");
          } catch (error) {
            // Fall back to the original article
            return {
              article_id: uuidv4(),
              title: article.title,
              content: article.content,
              image_url: `https://via.placeholder.com/800x400?text=${encodeURIComponent(
                article.category
              )}`,
              is_real: false,
              category: article.category,
              created_at: new Date().toISOString(),
              reason: article.reason,
            };
          }
        });

        // Use as many backup articles as needed
        const backupResults = await Promise.all(promises);
        const neededCount = 3 - fakeArticles.length;
        fakeArticles.push(...backupResults.slice(0, neededCount));
      } catch (error) {
        console.error("Error optimizing backup articles:", error);
        // Fall back to simple backup article if all else fails
        fakeArticles.push({
          article_id: uuidv4(),
          title: "Man Grows Third Arm After Getting COVID Vaccine",
          content:
            "A 45-year-old man from Florida claims to have grown a third arm after receiving his second dose of the COVID-19 vaccine. Medical experts dismiss the claim as physically impossible.",
          image_url:
            "https://images.unsplash.com/photo-1618015358954-331b9b0bb7b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmFjY2luZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
          is_real: false,
          category: "health",
          created_at: new Date().toISOString(),
          reason: "False Claim",
        });
      }
    }

    // Combine all articles and shuffle
    const newArticles = [...realArticles, ...fakeArticles].sort(
      () => Math.random() - 0.5
    );

    console.log(`Total: Generating ${newArticles.length} new articles`);

    // Insert new articles into the database
    if (newArticles.length > 0) {
      console.log("Attempting to insert articles into database");

      // Insert articles in smaller batches to avoid potential issues
      const batchSize = 3;
      const batches = [];

      for (let i = 0; i < newArticles.length; i += batchSize) {
        batches.push(newArticles.slice(i, i + batchSize));
      }

      console.log(`Splitting insertion into ${batches.length} batches`);

      let insertedCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(
          `Inserting batch ${i + 1}/${batches.length} with ${
            batch.length
          } articles`
        );

        try {
          const { error: insertError } = await supabase
            .from("news_articles")
            .insert(batch);

          if (insertError) {
            console.error(`Error inserting batch ${i + 1}:`, insertError);
            console.error(
              "First article in failed batch:",
              JSON.stringify(batch[0], null, 2)
            );
          } else {
            console.log(`Successfully inserted batch ${i + 1}`);
            insertedCount += batch.length;
          }
        } catch (batchError) {
          console.error(`Exception in batch ${i + 1}:`, batchError);
          // Continue with next batch even if this one failed
        }
      }

      if (insertedCount > 0) {
        console.log(`Successfully inserted ${insertedCount} articles in total`);
        return NextResponse.json({
          message: "Successfully added new articles",
          count: insertedCount,
        });
      } else {
        console.error("Failed to insert any articles");
        throw new Error("Failed to insert any articles");
      }
    } else {
      console.log("No articles were generated");
      return NextResponse.json({
        message: "No articles were generated. Please try again.",
        count: 0,
      });
    }
  } catch (error) {
    console.error("Error generating more articles:");
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", error);
    }
    return NextResponse.json(
      { error: "Failed to generate articles" },
      { status: 500 }
    );
  }
}
