'use client'

import { useState, useEffect } from 'react'

interface Player {
  id: number
  name: string
}

interface Turn {
  playerId: number
  playerName: string
  duration: number
  timestamp: number
}

export default function GameTimer() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  
  // Sample players - later we'll make this dynamic
  const [players] = useState<Player[]>([
    { id: 1, name: "Player 1" },
    { id: 2, name: "Player 2" },
    { id: 3, name: "Player 3" }
  ])

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
  const handleNextTurn = () => {
    // Record current turn
    const currentPlayer = players[currentPlayerIndex]
    setTurns(prev => [...prev, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      duration: elapsedTime,
      timestamp: Date.now()
    }])

    // Reset timer and move to next player
    setElapsedTime(0)
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length)
  }

  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        {/* Timer Display */}
        <div className="p-8">
          <div className="text-center text-6xl font-mono font-bold mb-8">
            {formatTime(elapsedTime)}
          </div>

          {/* Current Player */}
          <div className="text-center text-xl mb-8">
            Current Player: {players[currentPlayerIndex].name}
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
          </div>

          {/* Turn History */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Turn History</h2>
            <div className="space-y-2">
              {turns.map((turn, index) => (
                <div 
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg flex justify-between"
                >
                  <span>{turn.playerName}</span>
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