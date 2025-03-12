import Parser from "rss-parser";
import { v4 as uuidv4 } from "uuid";

// Define custom fields for the parser
interface CustomItem {
  content: string;
  contentSnippet?: string;
  "media:content"?: { $: { url: string } };
  enclosure?: { url: string };
  description?: string;
  summary?: string;
  "content:encoded"?: string;
}

interface CustomFeed {
  items: (CustomItem & Parser.Item)[];
}

// Initialize parser with custom fields
const parser = new Parser<CustomFeed, CustomItem>({
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

// List of RSS feeds from reputable science and tech news sources
export const rssFeeds = {
  scienceAndTech: [
    { url: "https://www.wired.com/feed/rss", name: "Wired" },
    { url: "https://www.theverge.com/rss/index.xml", name: "The Verge" },
    {
      url: "https://feeds.arstechnica.com/arstechnica/science",
      name: "Ars Technica Science",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
      name: "Ars Technica Tech",
    },
    {
      url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
      name: "NYT Science",
    },
    {
      url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
      name: "NYT Technology",
    },
    {
      url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      name: "BBC Science",
    },
    {
      url: "http://feeds.bbci.co.uk/news/technology/rss.xml",
      name: "BBC Technology",
    },
    { url: "https://www.sciencenews.org/feed", name: "Science News" },
  ],
};

// Helper to extract the most relevant content from an RSS item
function extractContent(item: CustomItem & Parser.Item): string {
  // Try different content fields in order of preference
  return (
    item["content:encoded"] ||
    item.content ||
    item.contentSnippet ||
    item.summary ||
    item.description ||
    ""
  ).slice(0, 500); // Limit content length
}

// Helper to extract image URL from various RSS formats
function extractImageUrl(item: CustomItem & Parser.Item): string | null {
  try {
    // Check various potential image locations
    if (item["media:content"]?.$.url) {
      return item["media:content"].$.url;
    }

    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // Try to extract from content using regex if no dedicated image field found
    const content =
      item["content:encoded"] || item.content || item.description || "";

    // Try different patterns for image extraction
    const imgMatches = [
      // Standard image tag
      content.match(/<img[^>]+src="([^">]+)"/i),
      // Figure with image
      content.match(/<figure[^>]*>.*?<img[^>]+src="([^">]+)"/i),
      // Background image in style
      content.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i),
    ];

    // Return the first successful match
    for (const match of imgMatches) {
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting image URL:", error);
    return null;
  }
}

// Fetch and parse articles from RSS feeds
export async function fetchRssArticles(
  limit = 10,
  category = "scienceAndTech"
): Promise<any[]> {
  try {
    // Get the feed list for the requested category
    const feedList =
      rssFeeds[category as keyof typeof rssFeeds] || rssFeeds.scienceAndTech;

    // Randomly select feeds to fetch from (to get variety)
    const shuffledFeeds = [...feedList].sort(() => Math.random() - 0.5);
    const selectedFeeds = shuffledFeeds.slice(
      0,
      Math.min(shuffledFeeds.length, 3)
    );

    console.log(
      `Selected feeds for fetching: ${selectedFeeds
        .map((f) => f.name)
        .join(", ")}`
    );

    // Fetch articles from selected feeds
    const feedPromises = selectedFeeds.map((feed) =>
      parser
        .parseURL(feed.url)
        .then((result) => {
          console.log(
            `Successfully fetched ${result.items.length} items from ${feed.name}`
          );
          return result.items.map((item) => {
            const content = extractContent(item);
            const imageUrl = extractImageUrl(item);

            return {
              source: feed.name,
              title: item.title || "Untitled Article",
              link: item.link || "#",
              pubDate: item.pubDate,
              content: content,
              imageUrl: imageUrl,
            };
          });
        })
        .catch((error) => {
          console.error(`Error fetching feed ${feed.url}:`, error);
          return [];
        })
    );

    // Wait for all feed fetches to complete
    const allFeedResults = await Promise.all(feedPromises);

    // Flatten the results and format for the application
    let articles = allFeedResults.flat();

    // Filter articles with title, content, and enough content length
    articles = articles.filter(
      (article) =>
        article.title && article.content && article.content.length > 100
    );

    console.log(
      `Total articles fetched before image filtering: ${articles.length}`
    );

    // For articles without images, fetch placeholder images
    for (let i = 0; i < articles.length; i++) {
      if (!articles[i].imageUrl) {
        try {
          // Extract keywords from title for relevant image
          const keywords = articles[i].title
            .split(" ")
            .filter((word: string) => word.length > 4)
            .slice(0, 3)
            .join(" ");

          articles[i].imageUrl = await fetchPlaceholderImage(
            keywords || "science technology"
          );
          console.log(
            `Fetched placeholder image for "${articles[i].title.substring(
              0,
              30
            )}..."`
          );
        } catch (imgError) {
          console.error("Error fetching placeholder image:", imgError);
          articles[i].imageUrl =
            "https://via.placeholder.com/800x600?text=Science+News";
        }
      }
    }

    // Now all articles have images
    console.log(`Total articles after ensuring images: ${articles.length}`);

    // Shuffle and limit
    const shuffledArticles = articles
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

    // Format for database
    return shuffledArticles.map((article) => ({
      article_id: uuidv4(),
      title: article.title,
      content: article.content,
      image_url: article.imageUrl,
      source: article.source,
      category: "science_tech",
      is_real: true, // These are all real articles
      reason: null,
      created_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching RSS feeds:", error);
    return [];
  }
}

// Function to fetch a placeholder image for articles without images
export async function fetchPlaceholderImage(keyword: string): Promise<string> {
  try {
    // Use Unsplash API to get a relevant image
    // You could replace this with any image API of your choice
    const encodedKeyword = encodeURIComponent(keyword);
    const response = await fetch(
      `https://source.unsplash.com/featured/800x600?${encodedKeyword}`
    );

    return response.url;
  } catch (error) {
    console.error("Error fetching placeholder image:", error);
    return "https://via.placeholder.com/800x600?text=No+Image+Available";
  }
}

// Generate fake news articles based on real articles by modifying content
export async function generateFakeArticles(
  realArticles: any[],
  count = 5
): Promise<any[]> {
  const fakeReasons = [
    "False Claim",
    "Misleading Headline",
    "Out of Context",
    "Satire or Parody",
    "Manipulated Content",
    "Conspiracy Theory",
  ];

  // Transform the real articles into fake ones
  const fakeArticles = [];

  for (let i = 0; i < Math.min(count, realArticles.length); i++) {
    const baseArticle = realArticles[i];
    const reason = fakeReasons[Math.floor(Math.random() * fakeReasons.length)];

    // Create a fake version based on the reason
    let fakeTitle = baseArticle.title;
    let fakeContent = baseArticle.content;

    switch (reason) {
      case "False Claim":
        // Invert the meaning or add false information
        fakeTitle = fakeTitle.replace(
          /discovered|found|developed|announced|confirmed/i,
          "failed to prove"
        );
        fakeContent = `Contrary to widespread claims, ${fakeContent.toLowerCase()}`;
        break;

      case "Misleading Headline":
        // Exaggerate the title
        fakeTitle = `BREAKING: Revolutionary ${fakeTitle} Changes Everything We Know`;
        // But keep content similar
        break;

      case "Out of Context":
        // Take content out of context
        fakeContent = `In a completely unrelated context, ${fakeContent}. Experts agree this has major implications for completely different fields.`;
        break;

      case "Satire or Parody":
        // Make it absurdly humorous
        fakeTitle = `${fakeTitle} Leads to Discovery of Aliens Living Among Us`;
        fakeContent = `In a twist no one saw coming, ${fakeContent}. Scientists are now convinced this is proof of extraterrestrial life.`;
        break;

      case "Manipulated Content":
        // Change key details
        fakeContent = fakeContent.replace(
          /increase|decrease|improve|reduce/gi,
          (word: string) => {
            const opposites = {
              increase: "decrease",
              decrease: "increase",
              improve: "worsen",
              reduce: "amplify",
            };
            return (
              opposites[word.toLowerCase() as keyof typeof opposites] || word
            );
          }
        );
        break;

      case "Conspiracy Theory":
        // Add conspiracy elements
        fakeTitle = `The Truth They Don't Want You to Know: ${fakeTitle}`;
        fakeContent = `Government insiders have revealed that ${fakeContent}. This information has been suppressed for decades.`;
        break;
    }

    fakeArticles.push({
      article_id: uuidv4(),
      title: fakeTitle,
      content: fakeContent,
      image_url: baseArticle.image_url,
      source: `Fake ${baseArticle.source}`,
      category: "science_tech",
      is_real: false,
      reason: reason,
      created_at: new Date().toISOString(),
    });
  }

  return fakeArticles;
}
