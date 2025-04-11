-- Add background_url column to game_template_sides table
ALTER TABLE game_template_sides 
ADD COLUMN IF NOT EXISTS background_url TEXT;
