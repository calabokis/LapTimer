// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './types'

export const supabase = createClientComponentClient<Database>()

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
