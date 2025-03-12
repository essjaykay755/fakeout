import { supabase } from "./supabase";

/**
 * Helper function to handle auth operations with refresh token error handling
 * @param authOperation - The authentication operation to perform
 * @returns The result of the operation
 */
export async function withAuthRetry<T>(
  authOperation: () => Promise<T>
): Promise<T> {
  try {
    // First attempt
    return await authOperation();
  } catch (error: any) {
    // Check if the error is a refresh token error
    if (
      error.message &&
      (error.message.includes("Invalid Refresh Token") ||
        error.message.includes("Refresh Token Not Found"))
    ) {
      console.log(
        "Refresh token error detected, attempting to refresh session"
      );

      try {
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("Failed to refresh session:", refreshError);
          // If refresh fails, clear everything
          await supabase.auth.signOut();
          throw new Error(
            "Authentication session expired. Please log in again."
          );
        }

        // If refresh succeeds, retry the original operation
        return await authOperation();
      } catch (refreshAttemptError) {
        console.error("Error during refresh attempt:", refreshAttemptError);
        // Clear auth state on refresh failure
        await supabase.auth.signOut();
        throw new Error("Authentication session expired. Please log in again.");
      }
    }

    // If it's not a refresh token error, rethrow
    throw error;
  }
}

/**
 * Checks if the current session is valid and refreshes if needed
 * @returns true if session is valid or was refreshed successfully
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      // Try to refresh the session
      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error("Failed to refresh session:", refreshError);
        return false;
      }

      return true;
    }

    return !!data.session;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
}
