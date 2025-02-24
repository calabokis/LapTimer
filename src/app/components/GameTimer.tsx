'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Player {
  id?: string
  name: string
  side?: string
  color?: string
  totalVP: number
  turnVP: number
}

interface Turn {
  playerName: string
  side?: string
  duration: number
  timestamp: number
  turnVP: number
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
  const [totalElapsedTime, setTotalElapsedTime] = useState(0)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [showConfirmEndGame, setShowConfirmEndGame] = useState(false)
  const [shouldUpdatePercentages, setShouldUpdatePercentages] = useState(true)

  // Game setup state
  const [players, setPlayers] = useState<Player[]>([])

  // For tracking when percentages should be calculated
  const lastCompletedRound = useRef(0)

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

    // Calculate percentage of total game time only when it should be updated
    if (shouldUpdatePercentages && gameElapsedTime > 0) {
      players.forEach(player => {
        const playerStat = stats[player.name];
        playerStat.percentage = Math.round((playerStat.totalTime / gameElapsedTime) * 100);
      });
    }

    return stats
  }, [turns, players, gameElapsedTime, shouldUpdatePercentages])

  // Load game setup from localStorage on component mount
  useEffect(() => {
    const gameSetup = localStorage.getItem('gameSetup')
    if (gameSetup) {
      const { players } = JSON.parse(gameSetup) as GameSetup

      // Initialize players with VP stats
      const playersWithVP = players.map(player => ({
        ...player,
        totalVP: 0,
        turnVP: 0
      }))

      setPlayers(playersWithVP)
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

  // Total elapsed time timer (includes pauses)
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTotalElapsedTime(prev => prev + 1000)
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  // We no longer automatically save game data when the game stops
  // Instead we'll save everything at the end of the game

  // Check if any player reaches 30 VP
  useEffect(() => {
    const checkVictoryPoints = () => {
      const hasWinner = players.some(player => player.totalVP >= 30)
      if (hasWinner && isRunning) {
        setIsRunning(false)
      }
    }

    checkVictoryPoints()
  }, [players, isRunning])

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

  // Update player's turn VP
  const updatePlayerTurnVP = (index: number, value: number) => {
    const newPlayers = [...players]
    newPlayers[index] = {
      ...newPlayers[index],
      turnVP: Math.max(0, Math.min(50, value))
    }
    setPlayers(newPlayers)
  }

  // Handle end turn
  const handleEndTurn = async () => {
    // Record current turn
    const currentPlayer = players[currentPlayerIndex]

    const newTurn = {
      playerName: currentPlayer.name,
      side: currentPlayer.side,
      duration: turnElapsedTime,
      timestamp: Date.now(),
      turnVP: currentPlayer.turnVP
    };

    setTurns(prev => [...prev, newTurn])

          // Update player's total VP
    const newPlayers = [...players]
    const newTotalVP = Math.min(50,
      newPlayers[currentPlayerIndex].totalVP + newPlayers[currentPlayerIndex].turnVP)
    newPlayers[currentPlayerIndex].totalVP = newTotalVP
    newPlayers[currentPlayerIndex].turnVP = 0
    setPlayers(newPlayers)

    // We don't update VP in Supabase immediately anymore
    // This will be saved when the game ends

    // We're no longer saving turn data in real-time
    // All turns will be saved together when the game ends

    // Calculate next player index
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;

    // Reset turn timer and move to next player
    setTurnElapsedTime(0)
    setCurrentPlayerIndex(nextPlayerIndex)

    // Only increment turn counter when a full round has been completed
    if (nextPlayerIndex === 0) {
      setTurnCounter(prev => prev + 1)
      // Update percentages at the end of each round
      setShouldUpdatePercentages(true)
      lastCompletedRound.current = turnCounter
    } else {
      setShouldUpdatePercentages(false)
    }
  }

  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(prev => !prev)
  }

  // Reset game and go back to setup with option to save
  const handleResetGame = () => {
    if (showConfirmReset) {
      // Ask if user wants to save before resetting
      if (gameElapsedTime > 0 && window.confirm('Would you like to save the current game before resetting?')) {
        saveGameData(true);
      }

      localStorage.removeItem('gameSetup')
      onReset()
    } else {
      setShowConfirmReset(true)
      setTimeout(() => setShowConfirmReset(false), 3000) // Hide confirmation after 3 seconds
    }
  }

  // Save all game data to Supabase
  const saveGameData = async (isReset = false) => {
    // Update percentages one last time
    setShouldUpdatePercentages(true)

    // Pause the game if it's running
    if (isRunning) {
      setIsRunning(false)
    }

    // Save all game data
    try {
      // 1. Save game state
      const { error: gameError } = await supabase
        .from('games')
        .update({
          total_elapsed_time: gameElapsedTime,
          updated_at: new Date().toISOString(),
          is_completed: !isReset
        })
        .eq('id', gameId);

      if (gameError) {
        console.error('Error saving game state:', gameError);
        return false;
      }

      // 2. Save all turns
      // First clear existing turns for this game
      const { error: clearTurnsError } = await supabase
        .from('turns')
        .delete()
        .eq('game_id', gameId);

      if (clearTurnsError) {
        console.error('Error clearing existing turns:', clearTurnsError);
        return false;
      }

      // Get player IDs from Supabase
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, name')
        .eq('game_id', gameId);

      if (playerError || !playerData) {
        console.error('Error fetching players:', playerError);
        return false;
      }

      // Create a map of player names to IDs
      const playerMap: Record<string, string> = {};
      playerData.forEach(player => {
        playerMap[player.name] = player.id;
      });

      // Now insert all turns
      const turnsToInsert = turns.map(turn => ({
        game_id: gameId,
        player_id: playerMap[turn.playerName] || '',
        duration: turn.duration,
        timestamp: new Date(turn.timestamp).toISOString(),
        victory_points: turn.turnVP
      }));

      if (turnsToInsert.length > 0) {
        const { error: insertTurnsError } = await supabase
          .from('turns')
          .insert(turnsToInsert);

        if (insertTurnsError) {
          console.error('Error saving turns:', insertTurnsError);
          return false;
        }
      }

      // 3. Update player VP totals
      for (const player of players) {
        const playerId = playerMap[player.name];
        if (playerId) {
          const { error: vpError } = await supabase
            .from('players')
            .update({ total_vp: player.totalVP })
            .eq('id', playerId);

          if (vpError) {
            console.error(`Error updating VP for ${player.name}:`, vpError);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving game data:', error);
      return false;
    }
  };

  // End game
  const handleEndGame = async () => {
    if (showConfirmEndGame) {
      // Save all game data to Supabase
      const success = await saveGameData();

      if (success) {
        alert('Game saved successfully!');
        // Optionally return to game setup
        if (window.confirm('Return to game setup?')) {
          localStorage.removeItem('gameSetup');
          onReset();
        }
      } else {
        alert('Failed to save game data. Please try again.');
      }

      setShowConfirmEndGame(false);
    } else {
      setShowConfirmEndGame(true);
      setTimeout(() => setShowConfirmEndGame(false), 3000); // Hide confirmation after 3 seconds
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
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl relative p-4">
        {/* Top Control Buttons */}
        <div className="flex justify-between items-center mb-6">
          {/* Reset Button (left) */}
          <button
            onClick={handleResetGame}
            className={`p-2 rounded-lg ${showConfirmReset ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>

          {/* Play/Pause Button (center) */}
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

          {/* End Game Button (right) */}
          <button
            onClick={handleEndGame}
            className={`p-2 rounded-lg ${showConfirmEndGame ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
          </button>
        </div>

        {/* Timer Display */}
        <div className="p-4">
          <div className="text-center text-6xl font-mono font-bold mb-1">
            {formatGameTime(gameElapsedTime)}
          </div>
          <div className="text-center text-2xl font-mono text-gray-500 mb-4">
            ({formatGameTime(totalElapsedTime)})
          </div>
          <div className="text-center text-2xl font-bold mb-8">
            Round {turnCounter}
          </div>

          {/* Player Statistics */}
          <div className="mt-4">
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
                        <div className="font-mono">
                          {stats.percentage}%
                        </div>
                      </div>
                    </div>

                    {/* VP Counters */}
                    <div className="flex items-center mt-2 space-x-4">
                      <div>
                        <span className="text-sm text-gray-600">Total VP:</span>
                        <div className="font-mono text-lg font-bold">{String(player.totalVP).padStart(2, '0')}</div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600">Turn VP:</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={player.turnVP}
                          onChange={(e) => updatePlayerTurnVP(index, parseInt(e.target.value) || 0)}
                          className="w-16 font-mono text-lg font-bold bg-white border rounded-md px-2"
                          disabled={!isCurrentPlayer}
                        />
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
                  <div className="flex items-center space-x-3">
                    <span className="font-mono">VP: {turn.turnVP}</span>
                    <span className="font-mono">{formatTime(turn.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
