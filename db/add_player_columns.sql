-- Add color and side_icon columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS side_icon TEXT;
