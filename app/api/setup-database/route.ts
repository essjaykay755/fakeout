import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// This route handler sets up some sample data for the database
export async function GET() {
  try {
    console.log("Setting up sample data...");

    // Create a few sample articles directly (skipping user creation)
    const { data: existingArticles, error: articleError } = await supabase
      .from("news_articles")
      .select("article_id")
      .limit(1);

    if (articleError) {
      console.error("Error checking for existing articles:", articleError);
      return NextResponse.json(
        {
          error: `Error checking for existing articles: ${JSON.stringify(
            articleError
          )}`,
        },
        { status: 500 }
      );
    }

    if (!existingArticles || existingArticles.length === 0) {
      // Create a few sample articles
      const sampleArticles = [
        {
          title: "New Cancer Treatment Shows Promise",
          content:
            "Scientists have discovered a revolutionary cancer treatment. In clinical trials, 85% of patients showed improvement. Researchers are optimistic about FDA approval next year.",
          is_real: true,
          category: "health",
        },
        {
          title: "Man Claims Aliens Abducted His Dog",
          content:
            "A local resident claims extraterrestrials took his pet. He describes a bright light and strange noises at night. Authorities found no evidence supporting his story.",
          is_real: false,
          reason: "False Claim",
          category: "science",
        },
        {
          title: "Tech CEO Announces Revolutionary AI",
          content:
            "A prominent tech company unveiled a groundbreaking AI. The CEO claims it has achieved consciousness. Experts remain skeptical about these assertions.",
          is_real: false,
          reason: "Misleading Headline",
          category: "technology",
        },
        {
          title: "New Study Links Coffee to Longevity",
          content:
            "Researchers found that drinking 2-3 cups of coffee daily may extend lifespan by up to 5 years. The study tracked 50,000 participants over a decade. Scientists attribute the effect to coffee's antioxidant properties.",
          is_real: true,
          category: "health",
        },
        {
          title: "Government Admits Weather Control Program",
          content:
            "A leaked document reveals a secret weather modification project. Officials claim they can control rainfall and prevent natural disasters. Environmental groups demand immediate transparency.",
          is_real: false,
          reason: "Conspiracy Theory",
          category: "politics",
        },
      ];

      console.log("Inserting sample articles...");
      const { data, error } = await supabase
        .from("news_articles")
        .insert(sampleArticles)
        .select();

      if (error) {
        console.error("Error creating sample articles:", error);
        return NextResponse.json(
          {
            error: `Error creating sample articles: ${JSON.stringify(error)}`,
          },
          { status: 500 }
        );
      } else {
        console.log(
          "Created sample articles successfully:",
          data?.length || 0,
          "articles"
        );
        return NextResponse.json({
          success: true,
          message: `Created ${data?.length || 0} sample articles successfully`,
          articles: data,
        });
      }
    } else {
      console.log("Articles already exist, skipping sample creation");
      return NextResponse.json({
        success: true,
        message: "Articles already exist in the database",
      });
    }
  } catch (error) {
    console.error("Error setting up database:", error);
    return NextResponse.json(
      { error: `Failed to set up database: ${JSON.stringify(error)}` },
      { status: 500 }
    );
  }
}
