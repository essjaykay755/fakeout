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

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!articleId) {
      return NextResponse.json(
        { error: "articleId is required" },
        { status: 400 }
      );
    }

    if (userAnswer === undefined) {
      return NextResponse.json(
        { error: "userAnswer is required" },
        { status: 400 }
      );
    }

    // Get the article to check if the answer is correct
    const { data: article, error: articleError } = await supabase
      .from("news_articles")
      .select("*")
      .eq("article_id", articleId)
      .single();

    if (articleError) {
      console.error("Error fetching article:", articleError);
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
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
    let sessionRecordingError = null;
    try {
      console.log("Recording game session with:", {
        userId,
        articleId,
        userAnswer,
        selectedReason,
        sessionId,
      });
      const { error: sessionError } = await recordGameSession(
        userId,
        articleId,
        userAnswer,
        selectedReason || undefined,
        sessionId || undefined
      );

      if (sessionError) {
        // Special handling for duplicate session records
        if (
          typeof sessionError === "object" &&
          sessionError !== null &&
          (Object.keys(sessionError).length === 0 ||
            // Check for Postgres error attributes safely
            ("code" in sessionError &&
              sessionError.code === "23505" &&
              "message" in sessionError &&
              typeof sessionError.message === "string" &&
              sessionError.message.includes("duplicate key value")) ||
            // Check for the generic error message we now use
            (sessionError instanceof Error &&
              sessionError.message &&
              (sessionError.message.includes("Record already exists") ||
                sessionError.message.includes("duplicate key") ||
                sessionError.message.includes("already exists"))))
        ) {
          console.log(
            "Duplicate or empty error from session recording - continuing without error"
          );
          // This is an expected condition, don't show warning
        } else {
          console.error("Error recording game session:", sessionError);
          sessionRecordingError = sessionError;
          // Continue with the rest of the function instead of throwing an error
        }
      }
    } catch (recordError) {
      console.error("Exception recording game session:", recordError);
      sessionRecordingError = recordError;
      // Continue with the rest of the function instead of throwing an error
    }

    // Update user points and mark article as seen
    try {
      const { error: userError } = await updateUserAfterAnswer(
        userId,
        articleId,
        pointsToAdd
      );

      if (userError) {
        console.error("Error updating user:", userError);
        return NextResponse.json(
          { error: "Failed to update user data", details: userError },
          { status: 500 }
        );
      }
    } catch (updateError) {
      console.error("Exception updating user:", updateError);
      return NextResponse.json(
        { error: "Exception updating user data", details: updateError },
        { status: 500 }
      );
    }

    const response: {
      success: boolean;
      pointsAdded: number;
      correctAnswer: boolean;
      correctReason: string | null;
      warning?: string;
      error?: string;
      message?: string;
    } = {
      success: true,
      pointsAdded: pointsToAdd,
      correctAnswer: article.is_real,
      correctReason: article.reason,
    };

    // Add warning if session recording failed but user update succeeded
    if (sessionRecordingError) {
      response.warning =
        "Game session was not recorded, but points were updated";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer", details: error },
      { status: 500 }
    );
  }
}
