import { supabase } from './supabase'

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

export const createGame = async (gameSetup: {
  gameName: string;
  location: string;
  notes: string;
  players: Array<{
    name: string;
    side?: string;
    sideIcon?: string;
    color?: string;
  }>;
}) => {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return { gameId: null, error: 'User not authenticated' };
    }

    // First, create the game record
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        name: gameSetup.gameName,
        location: gameSetup.location,
        notes: gameSetup.notes,
        status: 'in_progress',
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (gameError) {
      console.error('Game creation error:', gameError);
      return { gameId: null, error: gameError };
    }

    if (!game) {
      console.error('No game data returned');
      return { gameId: null, error: 'Failed to create game' };
    }

    console.log('Created game:', game);

    // Then create player records
    const playerPromises = gameSetup.players.map(async player => {
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: game.id,
          name: player.name,
          side: player.side,
          side_icon: player.sideIcon,
          color: player.color,
          total_vp: 0,
          turn_vp: 0
        });

      if (playerError) {
        console.error('Player creation error:', playerError);
        throw playerError;
      }
    });

    await Promise.all(playerPromises);

    // Create initial game stats
    const { error: statsError } = await supabase
      .from('game_stats')
      .insert({
        game_id: game.id,
        current_turn_number: 1,
        turn_elapsed_time: 0,
        game_elapsed_time: 0,
        total_elapsed_time: 0,
        last_updated: new Date().toISOString()
      });

    if (statsError) {
      console.error('Stats creation error:', statsError);
      return { gameId: null, error: statsError };
    }

    return { gameId: game.id, error: null };
  } catch (error) {
    console.error('Error creating game:', error);
    return { gameId: null, error };
  }
};
