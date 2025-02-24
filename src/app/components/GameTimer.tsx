'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Player {
  name: string
  side?: string
  color?: string
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
  percentage: number
}

interface GameSetup {
  gameName: string
  location: string
  players: Player[]
}

export default function GameTimer({
  gameId,
  onReset
}: {
  gameId: string
  onReset: () => void
}) {
  const [isRunning, setIsRunning] = useState(false)
  const [turnCounter, setTurnCounter] = useState(1)
  const [turnElapsedTime, setTurnElapsedTime] = useState(0)
  const [gameElapsedTime, setGameElapsedTime] = useState(0)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])

  // Game setup state
  const [gameName, setGameName] = useState('')
  const [location, setLocation] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  // Calculate player statistics
  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {}

    // Initialize stats for all players
    players.forEach(player => {
      stats[player.name] = {
        longestTurn: 0,
        averageTurn: 0,
        totalTime: 0,
        turnCount: 0,
        percentage: 0
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

    // Calculate percentage of total game time
    if (gameElapsedTime > 0) {
      players.forEach(player => {
        const playerStat = stats[player.name];
        playerStat.percentage = Math.round((playerStat.totalTime / gameElapsedTime) * 100);
      });
    }

    return stats
  }, [turns, players, gameElapsedTime])

  // Load game setup from localStorage on component mount
  useEffect(() => {
    const gameSetup = localStorage.getItem('gameSetup')
    if (gameSetup) {
      const { gameName, location, players } = JSON.parse(gameSetup) as GameSetup
      setGameName(gameName)
      setLocation(location)
      setPlayers(players)
    } else {
      onReset()
    }
  }, [onReset])

  // Timer effect for turn and game time
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isRunning) {
      intervalId = setInterval(() => {
        setTurnElapsedTime(prev => prev + 1000)
        setGameElapsedTime(prev => prev + 1000)
      }, 1000)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isRunning])

  // Save total elapsed time to Supabase when the game stops
  useEffect(() => {
    const saveElapsedTime = async () => {
      if (!isRunning && gameElapsedTime > 0 && gameId) {
        try {
          const { error } = await supabase
            .from('games')
            .update({
              total_elapsed_time: gameElapsedTime,
              updated_at: new Date().toISOString()
            })
            .eq('id', gameId)

          if (error) {
            console.error('Error saving elapsed time:', error)
          }
        } catch (error) {
          console.error('Error saving elapsed time:', error)
        }
      }
    }

    saveElapsedTime()
  }, [isRunning, gameElapsedTime, gameId])

  // Format time as mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // Format time as HH:mm:ss (for game timer)
  const formatGameTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  // Handle end turn
  const handleEndTurn = async () => {
    // Record current turn
    const currentPlayer = players[currentPlayerIndex]

    const newTurn = {
      playerName: currentPlayer.name,
      side: currentPlayer.side,
      duration: turnElapsedTime,
      timestamp: Date.now()
    };

    setTurns(prev => [...prev, newTurn])

    // Save turn to Supabase
    try {
      const { error } = await supabase
        .from('turns')
        .insert({
          game_id: gameId,
          player_id: currentPlayer.id || '', // You may need to get the actual player ID
          duration: turnElapsedTime,
          timestamp: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving turn:', error)
      }
    } catch (error) {
      console.error('Error saving turn:', error)
    }

    // Calculate next player index
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;

    // Reset turn timer and move to next player
    setTurnElapsedTime(0)
    setCurrentPlayerIndex(nextPlayerIndex)

    // Only increment turn counter when a full round has been completed
    if (nextPlayerIndex === 0) {
      setTurnCounter(prev => prev + 1)
    }
  }

  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(prev => !prev)
  }

  // Reset game and go back to setup
  const handleResetGame = () => {
    if (showConfirmReset) {
      localStorage.removeItem('gameSetup')
      onReset()
    } else {
      setShowConfirmReset(true)
      setTimeout(() => setShowConfirmReset(false), 3000) // Hide confirmation after 3 seconds
    }
  }

  // Get the background color for a player
  const getPlayerColor = (player: Player) => {
    return player.color || '#f3f4f6' // Default to light gray if no color
  }

  // If players are not loaded, show nothing
  if (players.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl relative">
        {/* Control Buttons in Top Right */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={toggleTimer}
            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            {isRunning ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>
          <button
            onClick={handleResetGame}
            className={`p-2 rounded-lg ${showConfirmReset ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        {/* Game Info */}
        <div className="p-4 bg-gray-50 text-center">
          <h1 className="text-xl font-bold">{gameName}</h1>
          <p className="text-gray-600">{location}</p>
        </div>

        {/* Timer Display */}
        <div className="p-8">
          <div className="text-center text-6xl font-mono font-bold mb-2">
            {formatGameTime(gameElapsedTime)}
          </div>
          <div className="text-center text-sm text-gray-500 mb-8">
            Turn: {turnCounter}
          </div>

          {/* Current Player */}
          <div className="text-center text-3xl mb-8 font-bold">
            {players[currentPlayerIndex].name}
          </div>

          {/* Player Statistics */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Player Statistics</h2>
            <div className="space-y-4">
              {players.map((player, index) => {
                const stats = playerStats[player.name]
                const isCurrentPlayer = index === currentPlayerIndex
                return (
                  <div
                    key={player.name}
                    className="p-4 rounded-lg relative"
                    style={{ backgroundColor: getPlayerColor(player) }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{player.name}</span>
                      {player.side && (
                        <span className="text-sm text-gray-600">
                          ({player.side})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Longest:</span>
                        <div className="font-mono">
                          {formatTime(stats.longestTurn)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Average:</span>
                        <div className="font-mono">
                          {formatTime(stats.averageTurn)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <div className="font-mono">
                          {formatTime(stats.totalTime)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">%:</span>
                        <div className="font-mono">
                          {stats.percentage}%
                        </div>
                      </div>
                    </div>

                    {/* End Turn Button (only shown for current player) */}
                    {isCurrentPlayer && (
                      <button
                        onClick={handleEndTurn}
                        disabled={!isRunning}
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-2 rounded-lg text-white font-bold
                          ${!isRunning
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                      >
                        End Turn
                      </button>
                    )}
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
