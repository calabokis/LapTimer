'use client'

import { useState, useEffect } from 'react'

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

interface GameSetup {
  gameName: string
  location: string
  players: Player[]
}

export default function GameTimer({ 
  onReset 
}: { 
  onReset: () => void 
}) {
  // Running state trackers
  const [isRunning, setIsRunning] = useState(false)
  
  // Time tracking states
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [actualPlayingTime, setActualPlayingTime] = useState(0)
  const [lastStartTime, setLastStartTime] = useState<number | null>(null)
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  
  // Game setup state
  const [gameName, setGameName] = useState('')
  const [location, setLocation] = useState('')
  const [players, setPlayers] = useState<Player[]>([])

  // Load game setup from localStorage on component mount
  useEffect(() => {
    const gameSetup = localStorage.getItem('gameSetup')
    if (gameSetup) {
      const { gameName, location, players } = JSON.parse(gameSetup) as GameSetup
      setGameName(gameName)
      setLocation(location)
      setPlayers(players)
    } else {
      // Call reset if no game setup exists
      onReset()
    }
  }, [onReset])

  // Total game time and actual playing time tracking effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isRunning) {
      // Record the start time when timer begins
      const startTime = Date.now()
      setLastStartTime(startTime)

      intervalId = setInterval(() => {
        const currentTime = Date.now()
        
        // Increment total game time
        setTotalGameTime(prev => prev + 1000)
        
        // Increment actual playing time
        setActualPlayingTime(prev => prev + 1000)
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
  const handleNextTurn = () => {
    // Record current turn
    const currentPlayer = players[currentPlayerIndex]
    setTurns(prev => [...prev, {
      playerName: currentPlayer.name,
      side: currentPlayer.side,
      duration: actualPlayingTime,
      timestamp: Date.now()
    }])

    // Move to next player
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length)
  }

  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(prev => !prev)
  }

  // Reset game and go back to setup
  const resetGame = () => {
    localStorage.removeItem('gameSetup')
    onReset()
  }

  // If players are not loaded, show nothing
  if (players.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        {/* Game Info */}
        <div className="p-4 bg-gray-50 text-center">
          <h1 className="text-xl font-bold">{gameName}</h1>
          <p className="text-gray-600">{location}</p>
        </div>

        {/* Time Displays */}
        <div className="p-8">
          <div className="flex justify-between mb-8">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-600">Total Game Time</div>
              <div className="text-4xl font-mono font-bold">
                {formatTime(totalGameTime)}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-sm text-gray-600">Playing Time</div>
              <div className="text-4xl font-mono font-bold">
                {formatTime(actualPlayingTime)}
              </div>
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
              onClick={toggleTimer}
              className={`w-full py-4 rounded-lg text-white font-bold text-xl
                ${isRunning 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
                }`}
            >
              {isRunning ? 'Stop' : 'Start'}
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
              onClick={resetGame}
              className="w-full py-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xl"
            >
              Reset Game
            </button>
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