-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  seen_articles TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create news_articles table
CREATE TABLE IF NOT EXISTS public.news_articles (
  article_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_real BOOLEAN NOT NULL,
  reason TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_articles_category ON news_articles(category);
-- Create index on is_real for faster filtering
CREATE INDEX IF NOT EXISTS idx_articles_is_real ON news_articles(is_real);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  article_id UUID REFERENCES news_articles(article_id),
  user_answer BOOLEAN NOT NULL,
  selected_reason TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_article_id ON game_sessions(article_id);

-- Create function to update user after answer
CREATE OR REPLACE FUNCTION update_user_after_answer(
  user_id UUID,
  article_id UUID,
  points_to_add INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET 
    points = points + points_to_add,
    seen_articles = array_append(seen_articles, article_id::TEXT)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample users if table is empty
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.users) = 0 THEN
    INSERT INTO public.users (id, username, email, points, seen_articles) VALUES
      (uuid_generate_v4(), 'GameMaster', 'gamemaster@example.com', 120, '{}'),
      (uuid_generate_v4(), 'NewsDetective', 'detective@example.com', 85, '{}'),
      (uuid_generate_v4(), 'TruthSeeker', 'truth@example.com', 65, '{}'),
      (uuid_generate_v4(), 'FactChecker', 'facts@example.com', 42, '{}'),
      (uuid_generate_v4(), 'MediaWiz', 'mediawiz@example.com', 30, '{}');
  END IF;
END $$; 