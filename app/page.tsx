"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section with Background */}
        <section className="relative min-h-[600px] flex items-center bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 overflow-hidden">
          {/* Abstract Shapes */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-yellow-400"></div>
            <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-red-500"></div>
            <div className="absolute top-40 right-40 w-20 h-20 rounded-full bg-green-500"></div>
            <div className="absolute bottom-40 left-20 w-32 h-32 rounded-full bg-purple-500"></div>
          </div>

          {/* Floating News Cards Animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 left-[10%] w-64 h-40 rounded-md bg-white p-3 shadow-lg rotate-[-5deg] opacity-20 animate-float-slow">
              <div className="w-full h-4 rounded-sm bg-gray-300 mb-2"></div>
              <div className="w-3/4 h-3 rounded-sm bg-gray-300 mb-2"></div>
              <div className="w-5/6 h-3 rounded-sm bg-gray-300"></div>
            </div>
            <div className="absolute top-[20%] right-[5%] w-56 h-36 rounded-md bg-white p-3 shadow-lg rotate-[8deg] opacity-30 animate-float">
              <div className="w-full h-4 rounded-sm bg-gray-300 mb-2"></div>
              <div className="w-3/4 h-3 rounded-sm bg-gray-300 mb-2"></div>
              <div className="w-5/6 h-3 rounded-sm bg-gray-300"></div>
            </div>
            <div className="absolute bottom-[15%] left-[15%] w-48 h-32 rounded-md bg-white p-3 shadow-lg rotate-[-10deg] opacity-25 animate-float-medium">
              <div className="w-full h-4 rounded-sm bg-gray-300 mb-2"></div>
              <div className="w-3/4 h-3 rounded-sm bg-gray-300 mb-2"></div>
              <div className="w-5/6 h-3 rounded-sm bg-gray-300"></div>
            </div>
          </div>

          <div className="container relative z-10 py-16">
            <div className="mx-auto max-w-[980px] flex flex-col md:flex-row items-center gap-12">
              <div className="text-white text-center md:text-left space-y-6 flex-1">
                <div className="inline-block px-3 py-1 bg-blue-500/30 backdrop-blur-sm rounded-full text-sm mb-2 font-medium animate-pulse">
                  Put your news detective skills to the test!
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  Can you spot{" "}
                  <span className="text-yellow-300 underline decoration-wavy decoration-yellow-500/30">
                    fake news
                  </span>
                  ?
                </h1>
                <p className="text-lg md:text-xl text-blue-100">
                  Sharpen your media literacy in this fun, challenging game.
                  Identify misleading content and climb the leaderboard!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  >
                    <Link href="/play">Play Now</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10 bg-blue-900/50 backdrop-blur-sm"
                  >
                    <Link href="/leaderboard">View Leaderboard</Link>
                  </Button>
                </div>
              </div>

              <div className="relative w-full max-w-[400px] aspect-square">
                <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping-slow"></div>
                <div className="relative z-10 w-full h-full rounded-full bg-blue-500/50 backdrop-blur-sm flex items-center justify-center">
                  <div className="relative w-5/6 h-5/6 rounded-full bg-blue-600/40 border-4 border-white/20"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How FakeOut Improves Your Media Literacy
              </h2>
              <p className="text-lg text-gray-600">
                Our game is designed to help you identify misleading content and
                become a more critical media consumer.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="group bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-5px]">
                <div className="w-14 h-14 mb-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
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
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  Learn to Identify
                </h3>
                <p className="text-gray-600">
                  Develop critical thinking skills to spot red flags in news
                  articles and social media content.
                </p>
              </div>

              <div className="group bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-5px]">
                <div className="w-14 h-14 mb-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
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
                    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
                    <path d="M10 2c1 .5 2 2 2 5" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-green-600 transition-colors duration-300">
                  Have Fun Learning
                </h3>
                <p className="text-gray-600">
                  Enjoy a gamified experience while improving your ability to
                  distinguish credible from questionable information.
                </p>
              </div>

              <div className="group bg-white rounded-xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-5px]">
                <div className="w-14 h-14 mb-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
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
                    <path d="M12 8c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5Z" />
                    <path d="m3 3 18 18" />
                    <path d="M10.5 10.5 8 13" />
                    <path d="M13.5 10.5 16 13" />
                    <path d="M10.5 13.5 8 11" />
                    <path d="M13.5 13.5 16 11" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-purple-600 transition-colors duration-300">
                  Compete & Improve
                </h3>
                <p className="text-gray-600">
                  Challenge yourself and others on the leaderboard as you become
                  better at detecting misinformation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="container">
            <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-blue-50 rounded-xl p-8 border border-blue-100">
                <div className="text-5xl font-bold text-blue-600 mb-2">65%</div>
                <p className="text-gray-600">
                  of adults have shared news without verifying it
                </p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-100">
                <div className="text-5xl font-bold text-yellow-600 mb-2">
                  7/10
                </div>
                <p className="text-gray-600">
                  people struggle to identify fake news
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-8 border border-green-100">
                <div className="text-5xl font-bold text-green-600 mb-2">2x</div>
                <p className="text-gray-600">
                  better at spotting fake news after playing
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gray-900 text-white text-center">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to test your skills?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of players already improving their media literacy
              through FakeOut.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8"
            >
              <Link href="/play">Start Playing Now</Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t bg-white py-8">
        <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <div className="text-xl font-bold mb-2">FakeOut</div>
            <p className="text-sm text-gray-500">
              Improving media literacy one game at a time
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <div className="flex gap-4 mb-4">
              <Link
                href="/about"
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
              >
                About
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
              >
                Terms
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} FakeOut. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(8deg);
          }
          50% {
            transform: translateY(-15px) rotate(10deg);
          }
        }
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0) rotate(-5deg);
          }
          50% {
            transform: translateY(-20px) rotate(-7deg);
          }
        }
        @keyframes float-medium {
          0%,
          100% {
            transform: translateY(0) rotate(-10deg);
          }
          50% {
            transform: translateY(-10px) rotate(-12deg);
          }
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.2;
          }
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 7s ease-in-out infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
