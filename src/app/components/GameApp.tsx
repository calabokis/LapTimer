'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Session } from '@supabase/supabase-js'
import GameSetup from './GameSetup'
import GameTimer from './GameTimer'
import Auth from './Auth'
import Navbar from './Navbar'

interface PlayerSetup {
  name: string
  side?: string
  color?: string
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
    notes: string
    players: PlayerSetup[]
  }) => {
    if (!session?.user?.id) return

    try {
      console.log("Starting game creation with:", gameInfo);
      
      // First, create the game record with total_elapsed_time initialized to 0
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name: gameInfo.gameName,
          location: gameInfo.location,
          notes: gameInfo.notes,
          user_id: session.user.id,
          total_elapsed_time: 0,
          is_completed: false
        })
        .select()
        .single()

      if (gameError) {
        console.error("Error creating game:", gameError);
        throw gameError;
      }

      console.log("Created game:", game);

      // Then, create player records (without storing color in the database, but initializing VP)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .insert(
          gameInfo.players.map(player => ({
            game_id: game.id,
            name: player.name,
            side: player.side,
            total_vp: 0
          }))
        )
        .select()

      if (playersError) {
        console.error("Error creating players:", playersError);
        throw playersError;
      }

      console.log("Created players:", playersData);

      // Set the current game ID
      setCurrentGameId(game.id);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    }
  }

  const handleGameReset = () => {
    setCurrentGameId(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {session && <Navbar />}
      <div className="flex-1">
        {!session ? (
          <Auth />
        ) : (
          <>
            {!currentGameId ? (
              <GameSetup onGameStart={handleGameStart} />
            ) : (
              <GameTimer gameId={currentGameId} onReset={handleGameReset} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
