-- Add player_views column to track how many times an article has been shown to users
ALTER TABLE IF EXISTS public.news_articles 
ADD COLUMN IF NOT EXISTS player_views INTEGER DEFAULT 0;

-- Create a function to increment player_views when an article is shown
CREATE OR REPLACE FUNCTION increment_article_views() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update the player_views counter for the article
  UPDATE news_articles
  SET player_views = player_views + 1
  WHERE article_id = NEW.article_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function after a new game_session record is inserted
DROP TRIGGER IF EXISTS increment_views_on_session ON public.game_sessions;
CREATE TRIGGER increment_views_on_session
AFTER INSERT ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION increment_article_views();

-- Add an index for faster queries on player_views
CREATE INDEX IF NOT EXISTS idx_news_articles_player_views ON news_articles(player_views);
