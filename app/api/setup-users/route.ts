import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// This route handler sets up the users table and adds sample users
export async function GET() {
  try {
    console.log("Setting up users table and sample data...");

    // Create the users table if it doesn't exist
    // Note: This approach uses SQL directly, which requires appropriate permissions
    // You might need to do this step manually in the Supabase dashboard
    try {
      const { error: createTableError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            seen_articles TEXT[] DEFAULT '{}'::text[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      });

      if (createTableError) {
        // If RPC isn't available, we can only report the error
        console.error("Error creating users table:", createTableError);
        // Continue anyway since we'll add sample data to existing table if possible
      } else {
        console.log("Users table created or already exists");
      }
    } catch (err) {
      console.error("Error executing SQL:", err);
    }

    // Check if there are existing users
    let existingUsers = null;
    try {
      const { data, error: checkError } = await supabase
        .from("users")
        .select("id")
        .limit(1);

      if (checkError) {
        console.error("Error checking for existing users:", checkError);
      } else {
        existingUsers = data;
      }
    } catch (err) {
      console.error("Error checking users:", err);
    }

    // Add sample users if none exist
    if (!existingUsers || existingUsers.length === 0) {
      // Generate some random UUIDs for sample users
      const sampleUsers = [
        {
          id: crypto.randomUUID(),
          username: "GameMaster",
          email: "gamemaster@example.com",
          points: 120,
          seen_articles: [],
        },
        {
          id: crypto.randomUUID(),
          username: "NewsDetective",
          email: "detective@example.com",
          points: 85,
          seen_articles: [],
        },
        {
          id: crypto.randomUUID(),
          username: "TruthSeeker",
          email: "truth@example.com",
          points: 65,
          seen_articles: [],
        },
        {
          id: crypto.randomUUID(),
          username: "FactChecker",
          email: "facts@example.com",
          points: 42,
          seen_articles: [],
        },
        {
          id: crypto.randomUUID(),
          username: "MediaWiz",
          email: "mediawiz@example.com",
          points: 30,
          seen_articles: [],
        },
      ];

      // Insert sample users
      try {
        const { error: insertError } = await supabase
          .from("users")
          .insert(sampleUsers);

        if (insertError) {
          console.error("Error adding sample users:", insertError);
        } else {
          console.log("Added sample users successfully");
        }
      } catch (err) {
        console.error("Error inserting users:", err);
      }
    } else {
      console.log("Users already exist, skipping sample data creation");
    }

    return NextResponse.json({
      success: true,
      message: "Users table and sample data setup completed",
    });
  } catch (error) {
    console.error("Error in setup-users:", error);
    return NextResponse.json(
      { error: "Failed to set up users" },
      { status: 500 }
    );
  }
}
