import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/header";

export default function About() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-blue-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg
              viewBox="0 0 1024 1024"
              className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80"
            >
              <circle
                cx="512"
                cy="512"
                r="512"
                fill="url(#gradient)"
                fillOpacity="0.7"
              />
              <defs>
                <radialGradient id="gradient">
                  <stop stopColor="#4f46e5" />
                  <stop offset="1" stopColor="#0ea5e9" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <div className="container py-16 md:py-24 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                About FakeOut
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                An educational game designed to help people improve their
                ability to identify misinformation and build critical media
                literacy skills.
              </p>
            </div>
          </div>

          {/* Decorative angled divider */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-white transform -skew-y-2 translate-y-8"></div>
        </section>

        {/* Main Content */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto max-w-4xl">
            <div className="grid md:grid-cols-2 gap-16 items-center mb-16">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-blue-900">
                  What is FakeOut?
                </h2>
                <div className="text-gray-700 space-y-4">
                  <p>
                    FakeOut is an educational game designed to help people
                    improve their ability to identify fake news. In today&apos;s
                    digital world, misinformation spreads rapidly, and it&apos;s
                    becoming increasingly difficult to distinguish fact from
                    fiction.
                  </p>
                  <p>
                    Our goal is to train users to recognize the common patterns
                    and techniques used in fake news articles, while having fun
                    in the process.
                  </p>
                </div>
              </div>
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                <Image
                  src="/misinformation-concept.jpg"
                  alt="Misinformation Concept"
                  width={500}
                  height={350}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 to-transparent flex items-end p-6">
                  <p className="text-white text-sm italic">
                    "The trouble with the internet is that it's replacing the
                    smartest person in the room with the loudest person in the
                    room."
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <h2 className="text-3xl font-bold mb-8 text-center text-blue-900">
                How to Play
              </h2>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-8">
                <div className="mb-6">
                  <p className="text-lg text-gray-700 mb-4">
                    The game is simple: we present you with short news articles,
                    and you decide whether they are real or fake. For fake
                    articles, you&apos;ll also need to identify the reason why
                    they are fake from multiple-choice options.
                  </p>
                </div>

                <h3 className="text-xl font-semibold mb-4 text-blue-800">
                  Scoring System
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
                    <h4 className="text-lg font-semibold mb-4 flex items-center text-green-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Points You Gain
                    </h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600 font-medium mr-2">
                          +1
                        </span>
                        <span>Correct identification of real news</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600 font-medium mr-2">
                          +2
                        </span>
                        <span>Correct identification of fake news</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600 font-medium mr-2">
                          +1
                        </span>
                        <span>Correct reason for why news is fake</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
                    <h4 className="text-lg font-semibold mb-4 flex items-center text-red-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Points You Lose
                    </h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-600 font-medium mr-2">
                          -1
                        </span>
                        <span>Mistaking real news as fake</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-600 font-medium mr-2">
                          -2
                        </span>
                        <span>Mistaking fake news as real</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-600 font-medium mr-2">
                          -1
                        </span>
                        <span>Incorrect reason selected for fake news</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-8 text-center text-blue-900">
                Types of Fake News
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-red-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-red-600">False Claims</CardTitle>
                    <CardDescription>Complete fabrication</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Information that is completely fabricated with no basis in
                      reality. These are stories invented entirely to deceive
                      readers.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-orange-600">
                      Misleading Headlines
                    </CardTitle>
                    <CardDescription>
                      Clickbait that misrepresents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Headlines that don&apos;t match the content of the
                      article, designed to attract clicks while distorting what
                      the story is actually about.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-yellow-600">
                      Out of Context
                    </CardTitle>
                    <CardDescription>Distorted presentation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Real information presented in a misleading context that
                      changes its meaning or implications significantly from the
                      original facts.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-green-600">
                      Satire or Parody
                    </CardTitle>
                    <CardDescription>Humor mistaken as fact</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Content intended to be humorous or satirical but that may
                      be mistaken as factual news when shared without proper
                      context.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-blue-600">
                      Impersonation
                    </CardTitle>
                    <CardDescription>False sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Content claiming to be from a legitimate source when it is
                      not, such as fake accounts pretending to be established
                      news organizations.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-purple-600">
                      Manipulated Content
                    </CardTitle>
                    <CardDescription>Distorted information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Genuine information or imagery that has been distorted,
                      manipulated, or edited to create a false narrative or
                      impression.
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 border-l-4 border-l-indigo-500 transition-transform hover:scale-[1.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-indigo-600">
                      Conspiracy Theory
                    </CardTitle>
                    <CardDescription>
                      Explanations that ignore facts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      Explanations for events that ignore more likely
                      explanations in favor of unproven theories, often
                      involving secretive plots by powerful entities or groups.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-blue-900 text-white py-16">
          <div className="container max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Test Your Knowledge?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Start playing FakeOut now to improve your ability to identify
              misleading information.
            </p>
            <a
              href="/play"
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-300"
            >
              Play Now
            </a>
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
              <a
                href="/about"
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
              >
                About
              </a>
              <a
                href="/privacy"
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
              >
                Terms
              </a>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} FakeOut. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
