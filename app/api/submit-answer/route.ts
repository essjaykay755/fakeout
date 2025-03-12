import { NextResponse } from "next/server";
import {
  supabase,
  updateUserAfterAnswer,
  recordGameSession,
} from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { userId, articleId, userAnswer, selectedReason, sessionId } =
      await request.json();

    // Get the article to check if the answer is correct
    const { data: article, error: articleError } = await supabase
      .from("news_articles")
      .select("*")
      .eq("article_id", articleId)
      .single();

    if (articleError) {
      throw articleError;
    }

    // Calculate points
    let pointsToAdd = 0;

    // Evaluate classification
    if (userAnswer === article.is_real) {
      // Correct classification
      pointsToAdd += article.is_real ? 1 : 2;
    } else {
      // Incorrect classification
      pointsToAdd -= article.is_real ? 2 : 1;
    }

    // Evaluate reason if applicable
    if (!article.is_real && userAnswer === false && selectedReason) {
      if (selectedReason === article.reason) {
        pointsToAdd += 1;
      } else {
        pointsToAdd -= 1;
      }
    }

    // Record the game session
    const { error: sessionError } = await recordGameSession(
      userId,
      articleId,
      userAnswer,
      selectedReason,
      sessionId
    );

    if (sessionError) {
      throw sessionError;
    }

    // Update user points and mark article as seen
    const { error: userError } = await updateUserAfterAnswer(
      userId,
      articleId,
      pointsToAdd
    );

    if (userError) {
      throw userError;
    }

    return NextResponse.json({
      success: true,
      pointsAdded: pointsToAdd,
      correctAnswer: article.is_real,
      correctReason: article.reason,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
