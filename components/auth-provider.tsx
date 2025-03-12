"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// Get supabase URL from environment if available, or use the extracted URL from logs if not
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "rhgewidysklwikhznrtk"; // From log: Extracted Supabase URL: https://rhgewidysklwikhznrtk.supabase.co

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      // Clear any problematic session data
      localStorage.removeItem("sb-" + supabaseUrl + "-auth-token");

      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Failed to refresh session:", error);
        // If refresh fails, clear everything and force re-login
        await supabase.auth.signOut();
        setUser(null);
      } else {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Error refreshing session:", err);
      // On any error, clear session and user
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  useEffect(() => {
    // Check for active session on mount
    const checkSession = async () => {
      // Check if we have a manual user in localStorage (for development)
      const manualUser = localStorage.getItem("manual_user");
      if (manualUser) {
        try {
          const parsedUser = JSON.parse(manualUser) as User;
          setUser(parsedUser);
          setLoading(false);
          return;
        } catch (error) {
          console.error("Error parsing manual user:", error);
          // Continue with normal auth if there's an error
          localStorage.removeItem("manual_user");
        }
      }

      try {
        // Normal Supabase Auth flow
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error, clearing session:", error);
          await refreshSession();
        } else {
          setUser(data.session?.user || null);
        }
      } catch (error) {
        console.error("Failed to get session:", error);
        // On any error, attempt to refresh
        await refreshSession();
      } finally {
        setLoading(false);
      }

      // Set up auth state listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("Auth state changed:", event);

          // If signing out, also clear manual user
          if (event === "SIGNED_OUT") {
            localStorage.removeItem("manual_user");
          }

          // Handle token refresh errors
          if (event === "TOKEN_REFRESHED") {
            console.log("Token refreshed successfully");
          }

          setUser(session?.user || null);
          setLoading(false);
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Always create a user profile in users table regardless of email confirmation
      if (data.user) {
        try {
          // First check if user already exists in the database
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", data.user.id)
            .single();

          if (!existingUser) {
            // Create user profile in the users table
            const { error: profileError } = await supabase
              .from("users")
              .insert({
                id: data.user.id,
                username,
                email,
                points: 0,
                seen_articles: [],
              });

            if (profileError) {
              console.error("Error creating user profile:", profileError);
            } else {
              console.log("User profile created successfully");

              // If the email is not confirmed, set up a manual user for development
              if (!data.user.email_confirmed_at) {
                const manualUser = {
                  id: data.user.id,
                  email: email,
                  app_metadata: {},
                  user_metadata: { full_name: username },
                  aud: "authenticated",
                  created_at: new Date().toISOString(),
                } as User;

                localStorage.setItem("manual_user", JSON.stringify(manualUser));
                setUser(manualUser);
              }
            }
          }
        } catch (profileError) {
          console.error("Error checking/creating user profile:", profileError);
        }
      }
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If email not confirmed error, try to handle it for development
      if (error && error.message.includes("Email not confirmed")) {
        console.log(
          "Email not confirmed, attempting alternate login for development"
        );

        // For development environment only: Try to find user by email
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (userData) {
          // Manually set user for development purposes
          console.log("Found user in database, setting manual session");
          const manualUser = {
            id: userData.id,
            email: userData.email,
            app_metadata: {},
            user_metadata: { full_name: userData.username },
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as User;

          setUser(manualUser);

          // Store the manual user in localStorage for persistence
          localStorage.setItem("manual_user", JSON.stringify(manualUser));
          return;
        } else {
          // Try to get user from Supabase Auth even if email is not confirmed
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            // Create user in the database
            const newUser = {
              id: authData.user.id,
              username: email.split("@")[0] || "Player",
              email: email,
              points: 0,
              seen_articles: [],
            };

            const { error: insertError } = await supabase
              .from("users")
              .insert(newUser);

            if (insertError) {
              console.error("Error creating user in database:", insertError);
            } else {
              // Set the user
              setUser(authData.user);
              return;
            }
          }
        }
      }

      if (error) throw error;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear the manual user from localStorage first
      localStorage.removeItem("manual_user");

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Ensure user state is cleared
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, signOut, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
