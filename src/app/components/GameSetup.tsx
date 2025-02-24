'use client'

import React, { useState } from 'react'

interface PlayerSetup {
  name: string
  side?: string
  color?: string
}

interface GameSetupProps {
  onGameStart: (gameInfo: {
    gameName: string
    location: string
    players: PlayerSetup[]
  }) => void
}

const gameTypes = [
  { name: 'Chess', sides: ['White', 'Black'] },
  { name: 'Monopoly', sides: [] },
  { name: 'Risk', sides: ['North', 'South', 'East', 'West'] },
  { name: 'Other', sides: [] }
]

// Common colors for board games
const playerColors = [
  { name: 'Red', value: '#FFCDD2' },
  { name: 'Blue', value: '#BBDEFB' },
  { name: 'Green', value: '#C8E6C9' },
  { name: 'Yellow', value: '#FFF9C4' },
  { name: 'Purple', value: '#E1BEE7' },
  { name: 'Orange', value: '#FFE0B2' },
  { name: 'Teal', value: '#B2DFDB' },
  { name: 'Pink', value: '#F8BBD0' },
  { name: 'Gray', value: '#F5F5F5' },
  { name: 'Brown', value: '#D7CCC8' },
]

export default function GameSetup({ onGameStart }: GameSetupProps) {
  const [gameName, setGameName] = useState('')
  const [location, setLocation] = useState('')
  const [selectedGameType, setSelectedGameType] = useState('')
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { name: '', side: '', color: playerColors[0].value }
  ])

  const handleAddPlayer = () => {
    const nextColorIndex = players.length % playerColors.length;
    setPlayers([...players, { name: '', side: '', color: playerColors[nextColorIndex].value }])
  }

  const updatePlayer = (index: number, updates: Partial<PlayerSetup>) => {
    const newPlayers = [...players]
    newPlayers[index] = { ...newPlayers[index], ...updates }
    setPlayers(newPlayers)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!gameName || !location || players.some(p => !p.name)) {
      alert('Please fill in all required fields')
      return
    }

    // Store game setup in localStorage
    const gameSetup = {
      gameName,
      location,
      players
    }
    localStorage.setItem('gameSetup', JSON.stringify(gameSetup))

    // Call onGameStart to transition to game timer
    onGameStart(gameSetup)
  }

  const selectedGameSides = gameTypes.find(gt => gt.name === selectedGameType)?.sides || []

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Game Setup</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game Name Input */}
          <div>
            <label htmlFor="gameName" className="block mb-2 font-medium">
              Game Name
            </label>
            <input
              id="gameName"
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter game name"
              required
            />
          </div>

          {/* Location Input */}
          <div>
            <label htmlFor="location" className="block mb-2 font-medium">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter game location"
              required
            />
          </div>

          {/* Game Type Selection */}
          <div>
            <label htmlFor="gameType" className="block mb-2 font-medium">
              Game Type
            </label>
            <select
              id="gameType"
              value={selectedGameType}
              onChange={(e) => setSelectedGameType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select Game Type</option>
              {gameTypes.map((gameType) => (
                <option key={gameType.name} value={gameType.name}>
                  {gameType.name}
                </option>
              ))}
            </select>
          </div>

          {/* Players Inputs */}
          <div>
            <label className="block mb-2 font-medium">Players</label>
            {players.map((player, index) => (
              <div key={index} className="mb-4 p-3 border rounded-lg" style={{ backgroundColor: player.color }}>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayer(index, { name: e.target.value })}
                    className="flex-grow px-3 py-2 border rounded-lg bg-white"
                    placeholder={`Player ${index + 1} Name`}
                    required
                  />

                  {selectedGameSides.length > 0 && (
                    <select
                      value={player.side}
                      onChange={(e) => updatePlayer(index, { side: e.target.value })}
                      className="px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">Select Side</option>
                      {selectedGameSides.map((side) => (
                        <option key={side} value={side}>
                          {side}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block mb-1 text-sm">
                    Player Color
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {playerColors.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        title={color.name}
                        onClick={() => updatePlayer(index, { color: color.value })}
                        className={`w-6 h-6 rounded-full border ${player.color === color.value ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddPlayer}
              className="w-full py-2 bg-blue-500 text-white rounded-lg mt-2 hover:bg-blue-600"
            >
              Add Player
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold mt-4"
          >
            Start Game
          </button>
        </form>
      </div>
    </div>
  )
}
