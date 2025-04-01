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
  sideIcon?: string
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
      
      // First, create the game record
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          name: gameInfo.gameName,
          location: gameInfo.location,
          notes: gameInfo.notes,
          user_id: session.user.id,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (gameError) {
        console.error("Error creating game:", gameError);
        throw gameError;
      }

      console.log("Created game:", game);

      // Then, create player records
      const { error: playersError } = await supabase
        .from('players')
        .insert(
          gameInfo.players.map(player => ({
            game_id: game.id,
            name: player.name,
            side: player.side,
            side_icon: player.sideIcon,
            color: player.color,
            total_vp: 0,
            turn_vp: 0
          }))
        );

      if (playersError) {
        console.error("Error creating players:", playersError);
        throw playersError;
      }

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
        console.error("Error creating game stats:", statsError);
        throw statsError;
      }

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
