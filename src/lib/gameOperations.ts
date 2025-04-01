import { supabase } from './supabase'
import type { GameStats, Turn, VPChange } from './supabase'

export const saveGameStats = async (
  gameId: string,
  currentPlayerId: string,
  turnCounter: number,
  turnElapsedTime: number,
  gameElapsedTime: number,
  totalElapsedTime: number
) => {
  try {
    const { data, error } = await supabase
      .from('game_stats')
      .upsert({
        game_id: gameId,
        current_player_id: currentPlayerId,
        current_turn_number: turnCounter,
        turn_elapsed_time: turnElapsedTime,
        game_elapsed_time: gameElapsedTime,
        total_elapsed_time: totalElapsedTime,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'game_id'
      })
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error saving game stats:', error)
    return { data: null, error }
  }
}

export const saveTurn = async (
  gameId: string,
  playerId: string,
  turnNumber: number,
  duration: number,
  vpChanges: number[]
) => {
  try {
    // First save the turn
    const { data: turnData, error: turnError } = await supabase
      .from('turns')
      .insert({
        game_id: gameId,
        player_id: playerId,
        turn_number: turnNumber,
        duration: duration
      })
      .select()
      .single()

    if (turnError || !turnData) {
      throw turnError || new Error('Failed to save turn')
    }

    // Then save VP changes if any
    if (vpChanges.length > 0) {
      const vpChangeRecords = vpChanges.map(vp => ({
        turn_id: turnData.id,
        game_id: gameId,
        player_id: playerId,
        vp_amount: vp
      }))

      const { error: vpError } = await supabase
        .from('vp_changes')
        .insert(vpChangeRecords)

      if (vpError) {
        throw vpError
      }
    }

    return { data: turnData, error: null }
  } catch (error) {
    console.error('Error saving turn:', error)
    return { data: null, error }
  }
}

export const updatePlayerTotalVP = async (
  playerId: string,
  totalVP: number
) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .update({ total_vp: totalVP })
      .eq('id', playerId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error updating player VP:', error)
    return { data: null, error }
  }
}

export const loadGameState = async (gameId: string) => {
  try {
    // Load game stats
    const { data: gameStats } = await supabase
      .from('game_stats')
      .select('*')
      .eq('game_id', gameId)
      .single()

    // Load turns with VP changes
    const { data: turns } = await supabase
      .from('turns')
      .select(`
        *,
        vp_changes (*)
      `)
      .eq('game_id', gameId)
      .order('turn_number')

    return {
      gameStats,
      turns,
      error: null
    }
  } catch (error) {
    console.error('Error loading game state:', error)
    return {
      gameStats: null,
      turns: null,
      error
    }
  }
}
