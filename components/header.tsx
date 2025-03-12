"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";

export function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // Check if user is admin
  const isAdmin = user && user.email === "essjaykay755@gmail.com";

  return (
    <header className="border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold">
            FakeOut
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            href="/about"
            className={`text-sm font-medium hover:underline ${
              pathname === "/about" ? "text-blue-600" : ""
            }`}
          >
            About
          </Link>
          <Link
            href="/leaderboard"
            className={`text-sm font-medium hover:underline ${
              pathname === "/leaderboard" ? "text-blue-600" : ""
            }`}
          >
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link
                href="/play"
                className={`text-sm font-medium hover:underline ${
                  pathname === "/play" ? "text-blue-600" : ""
                }`}
              >
                Play
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium hover:underline ${
                    pathname.startsWith("/admin") ? "text-blue-600" : ""
                  }`}
                >
                  Admin
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
