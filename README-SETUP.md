# FakeOut Setup Instructions

## Setting Up Your Database

The FakeOut game requires a few database tables to function properly. Here's how to set them up in your Supabase project:

### Option 1: Run the API Endpoints (Easiest)

If your Supabase project has appropriate permissions, you can simply run these two API endpoints:

1. Set up articles:

   ```
   curl http://localhost:3001/api/setup-database
   ```

2. Set up users:
   ```
   curl http://localhost:3001/api/setup-users
   ```

### Option 2: Run SQL Commands in Supabase Dashboard (Most Reliable)

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to the "SQL Editor" section
4. Click "New Query"
5. Copy and paste the contents of the `sql-setup-commands.sql` file
6. Click "Run" to execute the commands

This will:

- Create the necessary tables (users, news_articles, game_sessions)
- Set up appropriate indexes
- Create the required functions
- Insert sample data if the tables are empty

## Environment Variables

Make sure your `.env.local` file contains these variables:

```
NEWS_API_KEY=your_newsapi_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Starting the Development Server

Once your database is set up, start the development server:

```
npm run dev
```

## Testing the Application

1. Visit http://localhost:3001/play to play the game
2. Visit http://localhost:3001/leaderboard to see the leaderboard

Enjoy your FakeOut game!
