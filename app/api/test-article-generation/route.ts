import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  try {
    console.log("Test article generation endpoint called");

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
          url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
          name: "Ars Technica Tech",
        },
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
        return feed.items.slice(0, 3).map((item) => {
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
          } catch (imgError) {
            console.error("Error extracting image:", imgError);
          }

          // Use a placeholder if no image was found
          if (!imageUrl) {
            console.log("No image found, using placeholder");
            imageUrl =
              "https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bmV3c3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60";
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
            source: selectedFeed.name,
            category: "science_tech",
            is_real: true, // Real articles from real sources
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
          source: "Science Daily",
          image_url:
            "https://images.unsplash.com/photo-1566410845311-2b2b6e760840?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZnJvZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
          is_real: true,
          category: "science",
          created_at: new Date().toISOString(),
          reason: null,
        },
      ];
    }

    console.log("Starting to create fake articles");

    // Now create fake articles based on the real ones
    const fakeArticles = realArticles.slice(0, 2).map((realArticle) => {
      // Choose a fake news reason
      const fakeReasons = ["False Claim", "Misleading Headline"];
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
      }

      return {
        article_id: uuidv4(),
        title: fakeTitle,
        content: fakeContent,
        image_url: realArticle.image_url,
        source: `Fake ${realArticle.source}`,
        category: realArticle.category,
        is_real: false,
        reason: reason,
        created_at: new Date().toISOString(),
      };
    });

    // Add some additional fake articles if needed
    if (fakeArticles.length < 1) {
      console.log("Adding backup fake articles");
      fakeArticles.push({
        article_id: uuidv4(),
        title: "Man Grows Third Arm After Getting COVID Vaccine",
        content:
          "A 45-year-old man from Florida claims to have grown a third arm after receiving his second dose of the COVID-19 vaccine. Medical experts dismiss the claim as physically impossible.",
        source: "Health Freedom News",
        image_url:
          "https://images.unsplash.com/photo-1618015358954-331b9b0bb7b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmFjY2luZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
        is_real: false,
        category: "health",
        created_at: new Date().toISOString(),
        reason: "False Claim",
      });
    }

    // Combine all articles and shuffle
    const newArticles = [...realArticles, ...fakeArticles].sort(
      () => Math.random() - 0.5
    );

    console.log(`Total: Generated ${newArticles.length} new articles`);

    // Return the articles instead of inserting them
    return NextResponse.json({
      success: true,
      message: "Successfully generated articles",
      count: newArticles.length,
      articles: newArticles,
    });
  } catch (error) {
    console.error("Error in test article generation:");
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    } else {
      console.error("Unknown error type:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unknown error occurred",
        },
        { status: 500 }
      );
    }
  }
}
