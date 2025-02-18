// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types for our database
export type Game = {
  id: string
  name: string
  location: string
  created_at: string
  updated_at: string
  user_id: string
}

export type Player = {
  id: string
  game_id: string
  name: string
  side?: string
  created_at: string
}

export type Turn = {
  id: string
  game_id: string
  player_id: string
  duration: number
  timestamp: string
}
