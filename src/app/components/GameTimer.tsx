'use client'

import { useState, useEffect, useMemo } from 'react'

interface Player {
  name: string
  side?: string
}

interface Turn {
  playerName: string
  side?: string
  duration: number
  timestamp: number
}

interface PlayerStats {
  longestTurn: number
  averageTurn: number
  totalTime: number
  turnCount: number
}

interface GameSetup {
  gameName: string
  location: string
  players: Player[]
}

interface GameTimerProps {
  gameId: string
  onReset: () => void
}

export default function GameTimer({ gameId, onReset }: GameTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])

  // Game setup state
  const [gameName, setGameName] = useState('')
  const [location, setLocation] = useState('')
  const [players, setPlayers] = useState<Player[]>([])

  // Load game data from Supabase when gameId changes
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        if (gameError) throw gameError

        if (gameData) {
          setGameName(gameData.name)
          setLocation(gameData.location)
        }

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)

        if (playersError) throw playersError

        if (playersData) {
          setPlayers(playersData.map(p => ({
            name: p.name,
            side: p.side
          })))
        }
      } catch (error) {
        console.error('Error loading game data:', error)
        alert('Failed to load game data')
      }
    }

    loadGameData()
  }, [gameId])

  // Calculate player statistics
  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {}

    // Initialize stats for all players
    players.forEach(player => {
      stats[player.name] = {
        longestTurn: 0,
        averageTurn: 0,
        totalTime: 0,
        turnCount: 0
      }
    })

    // Calculate stats from turns
    turns.forEach(turn => {
      const playerStat = stats[turn.playerName]
      playerStat.longestTurn = Math.max(playerStat.longestTurn, turn.duration)
      playerStat.totalTime += turn.duration
      playerStat.turnCount += 1
      playerStat.averageTurn = Math.round(playerStat.totalTime / playerStat.turnCount)
    })

    return stats
  }, [turns, players])

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isRunning) {
      intervalId = setInterval(() => {
        setElapsedTime(prev => prev + 1000)
      }, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isRunning])

  // Format time as HH:MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // Handle next turn
  const handleNextTurn = async () => {
    if (!players[currentPlayerIndex]) return

    const currentPlayer = players[currentPlayerIndex]
    const turn = {
      playerName: currentPlayer.name,
      side: currentPlayer.side,
      duration: elapsedTime,
      timestamp: Date.now()
    }

    // Add turn to local state
    setTurns(prev => [...prev, turn])

    // Save turn to Supabase
    try {
      const { error } = await supabase
        .from('turns')
        .insert({
          game_id: gameId,
          player_id: players[currentPlayerIndex].id,
          duration: elapsedTime,
          timestamp: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving turn:', error)
      alert('Failed to save turn data')
    }

    // Reset timer and move to next player
    setElapsedTime(0)
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length)
  }

  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(prev => !prev)
  }

  // If no players are loaded yet, show loading state
  if (players.length === 0) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        {/* Rest of your component JSX remains the same */}
      </div>
    </div>
  )
}
