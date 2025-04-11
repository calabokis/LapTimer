-- Add notes column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS notes TEXT;
