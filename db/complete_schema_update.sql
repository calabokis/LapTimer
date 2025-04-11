-- Add missing columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add missing columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS side TEXT,
ADD COLUMN IF NOT EXISTS side_icon TEXT,
ADD COLUMN IF NOT EXISTS total_vp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS turn_vp INTEGER DEFAULT 0;

-- Create game_stats table if not exists
CREATE TABLE IF NOT EXISTS game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id),
    current_turn_number INTEGER DEFAULT 1,
    turn_elapsed_time INTEGER DEFAULT 0,
    game_elapsed_time INTEGER DEFAULT 0,
    total_elapsed_time INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id)
);
