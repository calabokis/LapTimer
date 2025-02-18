'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import GameSetup from './GameSetup'
import GameTimer from './GameTimer'
import Auth from './Auth'

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

  const handleGameStart = (gameId: string) => {
    setCurrentGameId(gameId)
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
