## AI Fake News Debunker Game Specification

### 1. Overview

The AI fake news debunker is a web-based game where users classify short news articles (3-4 sentences) as real or fake. For fake articles, users select the reason why they are fake from multiple-choice options. The game tracks user performance with a point system and displays top players on a leaderboard. The design will follow a clean, modern aesthetic inspired by the provided image, featuring a light color scheme, rounded cards, and a structured layout.

### 2. Technology Stack

- **Front End**: Next.js (React framework)
- **Back End**: Google Firebase
  - **Authentication**: Firebase Authentication
  - **Database**: Firestore
  - **Serverless Functions**: Firebase Cloud Functions
- **Fake News Generation**: Google Gemini 2.0 Flash API (accessed directly with API key)
- **Real News Source**: [NewsAPI.org](https://newsapi.org/) (free tier, fast API)
- **Styling**: Tailwind CSS (to achieve the clean, modern design)
- **Deployment**: Vercel (for hosting the Next.js app)

### 3. Key Features

- **User Authentication**: Sign up, log in, and profile management.
- **News Presentation**: Display short articles (3-4 sentences) for users to classify as real or fake.
- **Reason Selection**: Provide multiple-choice options for fake news reasons.
- **Point System**: Award points based on classification accuracy and reason selection.
- **Leaderboard**: Show top users by points.
- **Seen Articles Tracking**: Prevent users from seeing the same article twice.

### 4. Data Models (Firestore)

#### 4.1. Users Collection

- `userId` (string): Unique identifier.
- `username` (string): Display name.
- `email` (string): Email address.
- `points` (number): Total points.
- `seenArticles` (array of strings): IDs of articles the user has seen.

#### 4.2. News Articles Collection

- `articleId` (string): Unique identifier.
- `title` (string): Article title.
- `content` (string): Article body (3-4 sentences).
- `imageUrl` (string, optional): Image URL.
- `isReal` (boolean): True for real, false for fake.
- `reason` (string, if `isReal` is false): Reason the article is fake.
- `category` (string): News category (e.g., politics, technology).

#### 4.3. Game Sessions Collection (Optional)

- `sessionId` (string): Unique identifier.
- `userId` (string): User ID.
- `articleId` (string): Article ID.
- `userAnswer` (boolean): True if real, false if fake.
- `selectedReason` (string, if `userAnswer` is false): Chosen reason.
- `timestamp` (timestamp): Interaction time.

### 5. Game Flow

1. **User Authentication**: Users sign up or log in via Firebase Authentication.
2. **Start Game**: User begins a session.
3. **Fetch Articles**: Retrieve a mix of unseen real and fake articles.
4. **Present Article**: Show one article (3-4 sentences) with "Real" or "Fake" options.
5. **Reason Selection**: If "Fake" is chosen, display multiple-choice reasons.
6. **Evaluate Answer**: Award points based on accuracy.
7. **Update Data**: Update user points and mark article as seen.
8. **Leaderboard**: Display top users.

### 6. APIs and Services

#### 6.1. Google Gemini 2.0 Flash API (Fake News)

- **Purpose**: Generate fake news articles (3-4 sentences).
- **Integration**: Use the API key directly within Firebase Cloud Functions.
- **Prompt Examples**:
  - "Generate a fake news article (3-4 sentences) about a fictional tech breakthrough with a false claim."
  - "Create a short news article (3-4 sentences) about a celebrity with a misleading headline."
- **Storage**: Store in Firestore with `isReal: false` and `reason`.

#### 6.2. NewsAPI.org (Real News)

- **Purpose**: Fetch real news articles.
- **Details**: Free tier, fast, wide coverage.
- **Integration**: Use Cloud Functions to fetch articles, truncate to 3-4 sentences, and store in Firestore with `isReal: true`.
- **Endpoint**: `top-headlines` (e.g., `language: en`, `country: us`).

### 7. Multiple-Choice Reasons

- **Options**:
  - False Claim
  - Misleading Headline
  - Out of Context
  - Satire or Parody
  - Impersonation
  - Manipulated Content
  - Conspiracy Theory
- **Presentation**: For fake articles, show the correct reason plus two random incorrect ones, shuffled.

### 8. Point System

- **Rules**:
  - Correct real news: +1 point
  - Correct fake news: +2 points
  - Correct reason for fake news: +1 point
  - Incorrect real as fake: -1 point
  - Incorrect fake as real: -2 points
  - Incorrect reason: -1 point

### 9. Leaderboard

- **Display**: Top users by points.
- **Query**: Firestore `users` collection, ordered by `points` descending.

### 10. Design Inspiration (Based on Provided Image)

The design will mirror the clean, modern aesthetic of the provided image:

- **Color Scheme**: Light background (e.g., `#F5F7FA`), with accents of gray and blue.
- **Typography**: Bold headings for titles (e.g., "Connect. Learn. Earn." style) using a sans-serif font like Inter or Roboto.
- **Layout**:
  - **Header**: Logo on the left, navigation links ("About", "Blog", "Sign Up") on the right, styled with a subtle hover effect.
  - **Main Section**: Centered layout with rounded cards for articles, buttons, and leaderboard.
  - **Cards**: White background with soft shadows, rounded corners (like the "Your earnings" and "Connect sources" cards in the image).
  - **Buttons**: Rounded, with a gradient or solid fill (e.g., "Real" and "Fake" buttons in blue, multiple-choice options in gray).
  - **Leaderboard**: Displayed in a card with a clean table layout, similar to the "Connect sources" section.
- **Visual Elements**:
  - Use subtle icons or illustrations (like the chat bubbles in the image) to enhance engagement.
  - Include a progress indicator (like the dots in the image) to show article progression in a session.

### 11. Front End (Next.js)

#### 11.1. Pages

- **Login/Signup**: Authentication UI with a centered card, similar to the "Sign up" button placement in the image.
- **Game Play**: Article display in a rounded card, with "Real" and "Fake" buttons below, styled like the "Download on the App Store" button.
- **Leaderboard**: Top players list in a card, styled like the "Connect sources" section.
- **Profile**: User stats in a card, similar to the "Your earnings" section.

#### 11.2. Components

- **NewsArticle**: Title and content in a card with rounded corners, light background.
- **AnswerButtons**: "Real" and "Fake" buttons, styled with a blue gradient, rounded.
- **ReasonSelector**: Multiple-choice options in smaller rounded cards, gray background.
- **ScoreDisplay**: Current points in a small card, styled like the "Your earnings" section.
- **LeaderboardTable**: User rankings in a table within a card, clean and minimal.

#### 11.3. State Management

- Use React Context for:
  - User data
  - Current article
  - User answers
  - Session state

#### 11.4. Styling with Tailwind CSS

- **Example Classes**:
  - Card: `bg-white rounded-xl shadow-lg p-6`
  - Button: `bg-blue-500 text-white rounded-full px-6 py-2 hover:bg-blue-600`
  - Background: `bg-gray-100 min-h-screen`
  - Text: `text-4xl font-bold text-gray-800`

### 12. Back End (Firebase)

#### 12.1. Cloud Functions

- **GenerateFakeNews**:

  - Call Gemini 2.0 Flash API directly with API key.
  - Ensure articles are 3-4 sentences.

  ```javascript
  const axios = require("axios");

  async function generateFakeNews(prompt) {
    const response = await axios.post(
      "https://api.gemini.com/v2.0/flash/generate",
      { prompt: `${prompt} (3-4 sentences)` },
      { headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` } }
    );
    return response.data.text;
  }

  exports.generateArticle = async (req, res) => {
    const prompt =
      "Generate a fake news article about a celebrity with impersonation.";
    const article = await generateFakeNews(prompt);
    // Store in Firestore
    res.send(article);
  };
  ```

- **FetchRealNews**:

  - Call NewsAPI.org, truncate to 3-4 sentences.

  ```javascript
  const NewsAPI = require("newsapi");
  const newsapi = new NewsAPI("your-api-key");

  exports.fetchNews = async (req, res) => {
    const response = await newsapi.v2.topHeadlines({
      language: "en",
      country: "us",
    });
    const truncatedArticles = response.articles.map((article) => {
      const sentences =
        article.description.split(". ").slice(0, 4).join(". ") + ".";
      return { ...article, description: sentences };
    });
    // Store in Firestore
    res.send(truncatedArticles);
  };
  ```

- **HandleInteraction**:
  - Process answers, update points, mark articles seen.

#### 12.2. Firestore

- Store users, articles, and sessions.
- Enable real-time updates.

### 13. Implementation Details

- **Fake News Generation**: Ensure Gemini API generates 3-4 sentence articles with identifiable fake elements.
- **Real News Fetching**: Truncate NewsAPI.org articles to 3-4 sentences.
- **Game Logic**: Fetch 5 real and 5 fake unseen articles per session, present one at a time.
- **Reason Selection**: Show correct reason plus two random distractors, shuffled.

### 14. Deployment

- **Front End**: Vercel (host Next.js app).
- **Back End**: Firebase Hosting and Cloud Functions.

### 15. Additional Notes

- **Performance**: Cache NewsAPI.org articles in Firestore to handle rate limits.
- **Enhancements**: Add news categories or streaks for engagement.


