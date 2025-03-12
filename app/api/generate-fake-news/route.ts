import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// This route handler generates fake news articles using Google Gemini
export async function POST(request: Request) {
  try {
    const { category, fakeType } = await request.json();

    // Construct a comprehensive prompt with detailed instructions for Gemini
    let prompt = `Generate a fake news article about ${category} with the fake news type "${fakeType}". 
Follow these guidelines:
1. The article should be 3-4 complete, coherent sentences with a clear beginning and end
2. Start with a title that makes sense with the content
3. Make sure the article is complete and doesn't end mid-sentence
4. The fake element should be identifiable but not absurdly obvious
5. Include enough details to make it believable but false`;

    // Add specific detailed instructions based on the fake type
    switch (fakeType) {
      case "False Claim":
        prompt +=
          "\nInclude a completely fabricated claim that sounds plausible but is demonstrably untrue. Base it on real-world elements but include a false assertion that could be fact-checked.";
        break;
      case "Misleading Headline":
        prompt +=
          "\nCreate a headline that misrepresents or exaggerates the actual content of the article. The headline should suggest something more dramatic than what the article actually states.";
        break;
      case "Out of Context":
        prompt +=
          "\nTake a real fact or statistic but present it in a misleading context that changes its meaning or implications. Include the fact but frame it in a way that leads to incorrect conclusions.";
        break;
      case "Satire or Parody":
        prompt +=
          "\nWrite it as satire that could be mistaken for real news by someone who doesn't read carefully. Use elements of humor but make it subtle enough that some might believe it.";
        break;
      case "Impersonation":
        prompt +=
          "\nPretend the article is from a reputable source making an outlandish claim. Write as if a respected institution is endorsing something uncharacteristic.";
        break;
      case "Manipulated Content":
        prompt +=
          "\nInclude information that has been altered from its original meaning. Take something real but change key details that completely shift what it means.";
        break;
      case "Conspiracy Theory":
        prompt +=
          "\nInclude unfounded connections between unrelated events. Suggest a hidden plan or conspiracy without evidence, connecting dots that aren't actually related.";
        break;
      default:
        prompt +=
          "\nMake it clearly fake but somewhat believable. Include elements that could fool someone who isn't being critical.";
    }

    // Add a final instruction to ensure proper formatting
    prompt +=
      "\n\nFormat your response as follows:\nTitle: [Your headline here]\n[Body of the article with 3-4 complete sentences]";

    // Generate the fake news article using Gemini
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
      maxTokens: 300,
      temperature: 0.7,
    });

    // Extract title and content
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    let title = lines[0];
    let content = "";

    // Process the content
    if (lines.length > 1) {
      // If title is formatted as "Title: Something", extract the actual title
      if (title.toLowerCase().startsWith("title:")) {
        title = title.substring(6).trim();
      }

      // Join the remaining lines for content
      content = lines.slice(1).join(" ");
    } else {
      // In case of unexpected formatting, make a best effort attempt
      const parts = text.split(".");
      if (parts.length > 1) {
        title = parts[0].trim();
        content = parts.slice(1).join(".").trim();
      } else {
        title = "News Article";
        content = text.trim();
      }
    }

    // Ensure content doesn't end without proper punctuation
    if (
      content &&
      !content.endsWith(".") &&
      !content.endsWith("!") &&
      !content.endsWith("?")
    ) {
      content += ".";
    }

    // Store in Supabase (would be implemented in a real application)

    return NextResponse.json({
      title,
      content,
      is_real: false,
      reason: fakeType,
      category,
    });
  } catch (error) {
    console.error("Error generating fake news:", error);
    return NextResponse.json(
      { error: "Failed to generate fake news" },
      { status: 500 }
    );
  }
}
