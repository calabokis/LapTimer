'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import GameSetup from './GameSetup'
import GameTimer from './GameTimer'
import Auth from './Auth'

interface PlayerSetup {
  name: string
  side?: string
}

export default function GameApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleGameStart = async (gameInfo: {
    gameName: string
    location: string
    players: PlayerSetup[]
  }) => {
    if (!session?.user?.id) return

    try {
      // First, create the game record
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name: gameInfo.gameName,
          location: gameInfo.location,
          user_id: session.user.id
        })
        .select()
        .single()

      if (gameError) throw gameError

      // Then, create player records
      const { error: playersError } = await supabase
        .from('players')
        .insert(
          gameInfo.players.map(player => ({
            game_id: game.id,
            name: player.name,
            side: player.side
          }))
        )

      if (playersError) throw playersError

      // Set the current game ID
      setCurrentGameId(game.id)
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Failed to create game. Please try again.')
    }
  }

  const handleGameReset = () => {
    setCurrentGameId(null)
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div>
      {!currentGameId ? (
        <GameSetup onGameStart={handleGameStart} />
      ) : (
        <GameTimer gameId={currentGameId} onReset={handleGameReset} />
      )}
    </div>
  )
}
