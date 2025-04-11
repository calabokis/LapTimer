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
  total_elapsed_time: number
  is_completed: boolean
}

export type Player = {
  id: string
  game_id: string
  name: string
  side?: string
  created_at: string
  total_vp: number
}

export type Turn = {
  id: string
  game_id: string
  player_id: string
  turn_number: number
  duration: number
  timestamp: string
  created_at: string
  vp_changes?: VPChange[]
}

export type VPChange = {
  id: string
  turn_id: string
  game_id: string
  player_id: string
  vp_amount: number
  timestamp: string
  created_at: string
}

export type GameStats = {
  id: string
  game_id: string
  current_turn_number: number
  current_player_id: string
  turn_elapsed_time: number
  game_elapsed_time: number
  total_elapsed_time: number
  last_updated: string
  created_at: string
}
