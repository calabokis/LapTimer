-- Update turns table
ALTER TABLE turns 
  DROP COLUMN IF EXISTS victory_points,
  DROP COLUMN IF EXISTS vp_details,
  ADD COLUMN IF NOT EXISTS turn_number integer NOT NULL DEFAULT 1;

-- Add missing constraint (safely)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'turns_game_player_turn_idx'
  ) THEN
    ALTER TABLE turns 
      ADD CONSTRAINT turns_game_player_turn_idx 
      UNIQUE (game_id, player_id, turn_number);
  END IF;
END $$;
