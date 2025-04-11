-- Add status column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
