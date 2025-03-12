"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { ensureValidSession } from "@/lib/auth-helpers";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const { signIn, refreshSession } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Check for invalid session on mount
  useEffect(() => {
    const checkSession = async () => {
      const isValid = await ensureValidSession();
      setSessionError(!isValid);

      if (!isValid) {
        toast({
          title: "Session expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      }
    };

    checkSession();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await signIn(email, password);

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });

      router.push("/play");
    } catch (error: any) {
      console.error("Login error:", error);

      // If it's a token error, try refreshing the session
      if (error.message && error.message.includes("Refresh Token")) {
        try {
          await refreshSession();
          toast({
            title: "Session refreshed",
            description: "Please try logging in again.",
          });
          return;
        } catch (refreshError) {
          console.error("Refresh error:", refreshError);
        }
      }

      toast({
        title: "Login failed",
        description:
          error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // This would be implemented with Supabase Auth
      console.log("Google sign in");
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: "Sign in failed",
        description:
          "There was a problem signing in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Visual element */}
      <div className="hidden md:flex md:w-1/2 bg-blue-900 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 opacity-90"></div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-10 w-40 h-40 rounded-full bg-blue-500 opacity-20"></div>
          <div className="absolute bottom-1/3 -right-10 w-60 h-60 rounded-full bg-indigo-500 opacity-20"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full text-white p-12">
          <div className="mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-6">Welcome to FakeOut</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-md text-center">
            Sharpen your media literacy skills and learn to spot misinformation
          </p>

          <div className="space-y-8 max-w-md">
            <div className="flex items-start">
              <div className="bg-white/10 p-3 rounded-full mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                  <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                  <line x1="6" x2="6" y1="2" y2="4" />
                  <line x1="10" x2="10" y1="2" y2="4" />
                  <line x1="14" x2="14" y1="2" y2="4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-xl mb-1">
                  Learn to Identify
                </h3>
                <p className="text-blue-100 opacity-90">
                  Develop skills to spot fake news in your daily life
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-white/10 p-3 rounded-full mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-xl mb-1">Stay Informed</h3>
                <p className="text-blue-100 opacity-90">
                  Improve your media literacy and critical thinking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="mx-auto w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Log in</CardTitle>
              <Link href="/" className="text-sm text-blue-600 hover:underline">
                Return Home
              </Link>
            </div>
            <CardDescription>
              Log in to your FakeOut account to continue playing
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute border-t border-gray-200 w-full"></div>
                <span className="relative px-2 bg-white text-sm text-gray-500">
                  or continue with
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-gray-300 hover:bg-gray-50"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign up for free
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
