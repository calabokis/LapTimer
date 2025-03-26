'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image';

interface Player {
  id?: string
  name: string
  side?: string
  sideIcon?: string
  color?: string
  totalVP: number
  turnVP: number
}

interface Turn {
  playerName: string
  side?: string
  duration: number
  timestamp: number
  turnVPs: number[]  // Changed to array to track multiple VP entries
}

interface PlayerStats {
  lastTurn: number  // Changed from longestTurn to lastTurn
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
  const [turnVPs, setTurnVPs] = useState<number[]>([])  // Track multiple VP entries per turn

  // Game setup state
  const [players, setPlayers] = useState<Player[]>([])

  // For tracking percentages
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const hasInitializedPercentages = useRef(false);

  // Initialize playerStats with stored percentages
  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {}

    // Initialize stats for all players
    players.forEach(player => {
      stats[player.name] = {
        lastTurn: 0,
        averageTurn: 0,
        totalTime: 0,
        turnCount: 0,
        percentage: percentages[player.name] || 0
      }
    })

    // Calculate stats from turns
    turns.forEach(turn => {
      const playerStat = stats[turn.playerName]
      playerStat.lastTurn = turn.duration  // Just store the most recent turn duration
      playerStat.totalTime += turn.duration
      playerStat.turnCount += 1
      playerStat.averageTurn = Math.round(playerStat.totalTime / playerStat.turnCount)
    })

    // Only update the percentages when triggered
    if (shouldUpdatePercentages && gameElapsedTime > 0) {
      // Calculate total time across all players
      const totalPlayerTime = Object.values(stats).reduce((sum, stat) => sum + stat.totalTime, 0);

      if (totalPlayerTime > 0) {
        // Calculate percentages based on the total player time
        const newPercentages: Record<string, number> = {};
        players.forEach(player => {
          const playerStat = stats[player.name];
          // Store raw percentage for this calculation
          const rawPercentage = (playerStat.totalTime / totalPlayerTime) * 100;
          // Round for display
          playerStat.percentage = Math.round(rawPercentage);
          // Save for future reference
          newPercentages[player.name] = playerStat.percentage;
        });

        // Save the percentages for future use
        setPercentages(newPercentages);
      }

      // Reset the update flag
      if (shouldUpdatePercentages) {
        setShouldUpdatePercentages(false);
      }
    }

    return stats
  }, [turns, players, gameElapsedTime, shouldUpdatePercentages, percentages])

  // Effect to initialize percentages
  useEffect(() => {
    // Initialize percentages only once we have player data and at least one turn
    if (players.length > 0 && turns.length > 0 && !hasInitializedPercentages.current) {
      setShouldUpdatePercentages(true);
      hasInitializedPercentages.current = true;
    }
  }, [players, turns]);

  // Initialize turnVPs array when a new turn starts
  useEffect(() => {
    setTurnVPs([]);
  }, [currentPlayerIndex]);

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
    // Allow negative values for turn VP
    newPlayers[index] = {
      ...newPlayers[index],
      turnVP: value
    }
    setPlayers(newPlayers)
  }

  // Add VP to the current turn record
  const handleAddVP = () => {
    if (!isRunning) return;

    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.turnVP === 0) return; // Don't record 0 VP entries

    // Add this VP to the turnVPs array for this turn
    setTurnVPs(prev => [...prev, currentPlayer.turnVP]);

    // Update player's total VP (don't allow negative total VP)
    const newPlayers = [...players];
    const newTotalVP = Math.max(0, newPlayers[currentPlayerIndex].totalVP + currentPlayer.turnVP);
    newPlayers[currentPlayerIndex].totalVP = newTotalVP;
    newPlayers[currentPlayerIndex].turnVP = 0; // Reset turn VP after adding
    setPlayers(newPlayers);
  }

  // Handle end turn
const handleEndTurn = async () => {
  const currentPlayer = players[currentPlayerIndex];

  // Add current VP to turnVPs if it's not 0
  if (currentPlayer.turnVP !== 0) {
    // Add the current turnVP to the array
    const updatedTurnVPs = [...turnVPs, currentPlayer.turnVP];
    setTurnVPs(updatedTurnVPs);

    // Update player's total VP (don't allow negative total VP)
    const newPlayers = [...players];
    const newTotalVP = Math.max(0, newPlayers[currentPlayerIndex].totalVP + currentPlayer.turnVP);
    newPlayers[currentPlayerIndex].totalVP = newTotalVP;
    newPlayers[currentPlayerIndex].turnVP = 0;
    setPlayers(newPlayers);

    // Use the updated turnVPs array in the new turn
    const newTurn = {
      playerName: currentPlayer.name,
      side: currentPlayer.side,
      duration: turnElapsedTime,
      timestamp: Date.now(),
      turnVPs: updatedTurnVPs  // Use the updated array including the current turnVP
    };

    setTurns(prev => [...prev, newTurn]);
  } else {
    // Even if there are no current VP changes, we should include previous VP changes from this turn
    const newTurn = {
      playerName: currentPlayer.name,
      side: currentPlayer.side,
      duration: turnElapsedTime,
      timestamp: Date.now(),
      turnVPs: turnVPs  // Use existing turnVPs
    };

    setTurns(prev => [...prev, newTurn]);
  }

  // Calculate next player index
  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;

  // Update percentages after each turn, not just at the end of a round
  setShouldUpdatePercentages(true);

  // Reset turn timer and move to next player
  setTurnElapsedTime(0);
  setCurrentPlayerIndex(nextPlayerIndex);
  setTurnVPs([]);  // Clear the turnVPs array for the next player

  // Only increment turn counter when a full round has been completed
  if (nextPlayerIndex === 0) {
    setTurnCounter(prev => prev + 1);
  }
}

  // Toggle timer
  const toggleTimer = () => {
    // Update percentages when pausing
    if (isRunning) {
      setShouldUpdatePercentages(true);
    }
    setIsRunning(prev => !prev);
  }

  // Save all game data to Supabase
  const saveGameData = async (isReset = false) => {
    // Update percentages one last time
    setShouldUpdatePercentages(true);

    // Pause the game if it's running
    if (isRunning) {
      setIsRunning(false);
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

      // Now insert all turns - we'll save the sum of turnVPs for each turn
      const turnsToInsert = turns.map(turn => ({
        game_id: gameId,
        player_id: playerMap[turn.playerName] || '',
        duration: turn.duration,
        timestamp: new Date(turn.timestamp).toISOString(),
        victory_points: turn.turnVPs.reduce((sum, vp) => sum + vp, 0), // Sum all VPs for this turn
        vp_details: JSON.stringify(turn.turnVPs) // Store the detailed VP breakdown
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

      // 3. Update player VP totals (these are always non-negative)
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

  // Reset game and go back to setup with option to save
  const handleResetGame = () => {
    if (showConfirmReset) {
      // Ask if user wants to save before resetting
      if (gameElapsedTime > 0 && window.confirm('Would you like to save the current game before resetting?')) {
        saveGameData(true);
      }

      localStorage.removeItem('gameSetup');
      onReset();
    } else {
      setShowConfirmReset(true);
      setTimeout(() => setShowConfirmReset(false), 3000); // Hide confirmation after 3 seconds
    }
  }

  // Get the background color for a player
  const getPlayerColor = (player: Player) => {
    return player.color || '#f3f4f6'; // Default to light gray if no color
  }

  // If players are not loaded, show nothing
  if (players.length === 0) {
    return null;
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

          {/* End Game Button (right) - Changed to Crown icon */}
          <button
            onClick={handleEndGame}
            className={`p-2 rounded-lg ${showConfirmEndGame ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
              <path d="M4 19h16"/>
              <path d="M4 22h16"/>
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
                const stats = playerStats[player.name];
                const isCurrentPlayer = index === currentPlayerIndex;
                return (
                  <div
                    key={player.name}
                    className="p-4 rounded-lg relative"
                    style={{ backgroundColor: getPlayerColor(player) }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">
                        {player.name}
                        {player.side && (
                          <span className="ml-1 text-gray-700">
                            - {player.side}
                          </span>
                        )}
                        {player.side && player.sideIcon && (
                          <div className="ml-2 flex items-center">
                          <Image
                            src={player.sideIcon}
                            alt={player.side || ""}
                            width={20}
                            height={20}
                            className="object-contain"
                            onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                                const span = document.createElement('span');
                                span.className = 'w-5 h-5 inline-flex items-center justify-center bg-gray-200 rounded-full text-xs font-bold';
                                span.innerText = player.side.charAt(0).toUpperCase();
                                e.currentTarget.parentElement?.appendChild(span);
                              }}
                            />
                          </div>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Last:</span>
                        <div className="font-mono">
                          {formatTime(stats.lastTurn)}
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
                        <div className="font-mono text-xs">
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

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Turn VP:</span>
                        <input
                          type="number"
                          value={player.turnVP}
                          onChange={(e) => updatePlayerTurnVP(index, parseInt(e.target.value) || 0)}
                          className="w-16 font-mono text-lg font-bold bg-white border rounded-md px-2"
                          disabled={!isCurrentPlayer}
                        />

                        {/* Add VP Button */}
                        {isCurrentPlayer && (
                          <button
                            onClick={handleAddVP}
                            disabled={!isRunning}
                            className={`px-2 py-1 rounded text-white ${!isRunning ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600'}`}
                            title="Add VP"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Current TurnVPs Display */}
                    {isCurrentPlayer && turnVPs.length > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Turn VPs:</span>
                        <span className="ml-2 font-mono">{turnVPs.join(', ')}</span>
                      </div>
                    )}

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
                );
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
                        - {turn.side}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {turn.turnVPs.length > 0 && (
                      <span className="font-mono">
                        VP: {turn.turnVPs.join(', ')}
                      </span>
                    )}
                    <span className="font-mono">{formatTime(turn.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
