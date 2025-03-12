// Simple script to test RSS feed fetching
const Parser = require("rss-parser");

// Initialize the parser
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

// List of RSS feeds to try
const feeds = [
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
  { url: "https://www.sciencenews.org/feed", name: "Science News" },
];

// Helper to extract the most relevant content from an RSS item
function extractContent(item) {
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
function extractImageUrl(item) {
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
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);

  return imgMatch ? imgMatch[1] : null;
}

async function testRssFeed() {
  try {
    console.log("Testing RSS feed fetching...");

    // Try each feed
    for (const feed of feeds) {
      try {
        console.log(`\nFetching from ${feed.name}...`);
        const result = await parser.parseURL(feed.url);

        if (result.items && result.items.length > 0) {
          console.log(`Successfully fetched ${result.items.length} items`);

          // Display first item as example
          const firstItem = result.items[0];
          console.log("\nExample item:");
          console.log(`Title: ${firstItem.title}`);
          console.log(`Link: ${firstItem.link}`);

          const content = extractContent(firstItem);
          console.log(`Content snippet: ${content.substring(0, 100)}...`);

          const imageUrl = extractImageUrl(firstItem);
          console.log(`Image URL: ${imageUrl || "None found"}`);
        } else {
          console.log("No items found in feed");
        }
      } catch (error) {
        console.error(`Error fetching from ${feed.name}:`, error.message);
      }
    }

    console.log("\nRSS feed testing complete");
  } catch (error) {
    console.error("Error in RSS feed test:", error);
  }
}

// Run the test
testRssFeed();
