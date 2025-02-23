'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Player {
  id: string
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

interface GameTimerProps {
  gameId: string
  onReset: () => void
}

export default function GameTimer({ gameId, onReset }: GameTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [gameTime, setGameTime] = useState(0) // Active game time
  const [totalTime, setTotalTime] = useState(0) // Total elapsed time including pauses
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  // Load players data from Supabase when gameId changes
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)

        if (playersError) throw playersError

        if (playersData) {
          setPlayers(playersData)
        }
      } catch (error) {
        console.error('Error loading players data:', error)
        alert('Failed to load players data')
      }
    }

    loadPlayers()
  }, [gameId])

  // Timer effects - one for game time, one for total time
  useEffect(() => {
    let gameIntervalId: NodeJS.Timeout
    if (isRunning) {
      gameIntervalId = setInterval(() => {
        setGameTime(prev => prev + 1000)
      }, 1000)
    }
    return () => {
      if (gameIntervalId) {
        clearInterval(gameIntervalId)
      }
    }
  }, [isRunning])

  useEffect(() => {
    // Total time always increments, even when game is paused
    const totalIntervalId = setInterval(() => {
      setTotalTime(prev => prev + 1000)
    }, 1000)
    return () => clearInterval(totalIntervalId)
  }, [])

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
      duration: gameTime,
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
          player_id: currentPlayer.id,
          duration: gameTime,
          timestamp: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving turn:', error)
      alert('Failed to save turn data')
    }

    // Reset game timer and move to next player
    setGameTime(0)
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length)
  }

  // Calculate player statistics
  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {}
    players.forEach(player => {
      stats[player.name] = {
        longestTurn: 0,
        averageTurn: 0,
        totalTime: 0,
        turnCount: 0
      }
    })

    turns.forEach(turn => {
      const playerStat = stats[turn.playerName]
      playerStat.longestTurn = Math.max(playerStat.longestTurn, turn.duration)
      playerStat.totalTime += turn.duration
      playerStat.turnCount += 1
      playerStat.averageTurn = Math.round(playerStat.totalTime / playerStat.turnCount)
    })

    return stats
  }, [turns, players])

  // If no players are loaded yet, show loading state
  if (players.length === 0) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        {/* Timer Display */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="text-6xl font-mono font-bold">
              {formatTime(gameTime)}
            </div>
            <div className="text-2xl font-mono text-gray-500 mt-2">
              ({formatTime(totalTime)})
            </div>
          </div>

          {/* Current Player */}
          <div className="text-center text-xl mb-8">
            Current Player: {players[currentPlayerIndex].name}
            {players[currentPlayerIndex].side &&
              <span className="ml-2 text-gray-600">
                (Side: {players[currentPlayerIndex].side})
              </span>
            }
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full py-4 rounded-lg text-white font-bold text-xl
                ${isRunning
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-green-500 hover:bg-green-600'
                }`}
            >
              {isRunning ? 'Pause' : 'Start'}
            </button>

            <button
              onClick={handleNextTurn}
              disabled={!isRunning}
              className={`w-full py-4 rounded-lg text-white font-bold text-xl
                ${!isRunning
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
                }`}
            >
              Next Turn
            </button>

            <button
              onClick={onReset}
              className="w-full py-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xl"
            >
              Reset Game
            </button>
          </div>

          {/* Player Statistics */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Player Statistics</h2>
            <div className="space-y-4">
              {players.map(player => {
                const stats = playerStats[player.name]
                return (
                  <div
                    key={player.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{player.name}</span>
                      {player.side && (
                        <span className="text-sm text-gray-600">
                          ({player.side})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Longest Turn:</span>
                        <span className="ml-2 font-mono">
                          {formatTime(stats.longestTurn)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Average Turn:</span>
                        <span className="ml-2 font-mono">
                          {formatTime(stats.averageTurn)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Time:</span>
                        <span className="ml-2 font-mono">
                          {formatTime(stats.totalTime)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Turn Count:</span>
                        <span className="ml-2 font-mono">
                          {stats.turnCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Turn History */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Turn History</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {turns.map((turn, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span>{turn.playerName}</span>
                    {turn.side && (
                      <span className="ml-2 text-xs text-gray-600">
                        ({turn.side})
                      </span>
                    )}
                  </div>
                  <span className="font-mono">{formatTime(turn.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
