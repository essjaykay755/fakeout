-- Create the article_content_cache table for storing fixed article content
CREATE TABLE IF NOT EXISTS article_content_cache (
    id UUID PRIMARY KEY,
    original_article_id UUID NOT NULL,
    original_title TEXT NOT NULL,
    original_content TEXT NOT NULL,
    fixed_title TEXT NOT NULL,
    fixed_content TEXT NOT NULL,
    is_real BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_article_id) REFERENCES news_articles(article_id) ON DELETE CASCADE
);

-- Add an index for faster lookups by original article ID
CREATE INDEX IF NOT EXISTS article_content_cache_original_article_id_idx ON article_content_cache(original_article_id);

-- Add RLS policies for the new table
ALTER TABLE article_content_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read the cache but only authenticated users can insert
CREATE POLICY "Anyone can read article_content_cache" 
ON article_content_cache 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert article_content_cache" 
ON article_content_cache 
FOR INSERT 
TO authenticated 
WITH CHECK (true); 