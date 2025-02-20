'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface PlayerSetup {
  name: string
}

interface GameSetupProps {
  onGameStart: (gameInfo: {
    gameName: string
    location: string
    players: PlayerSetup[]
  }) => void
}

interface FrequencyMap {
  [key: string]: number
}

export default function GameSetup({ onGameStart }: GameSetupProps) {
  const [gameName, setGameName] = useState('')
  const [location, setLocation] = useState('')
  const [players, setPlayers] = useState<PlayerSetup[]>([{ name: '' }])

  // For suggestions
  const [commonGameNames, setCommonGameNames] = useState<string[]>([])
  const [commonLocations, setCommonLocations] = useState<string[]>([])
  const [commonPlayers, setCommonPlayers] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to sort by frequency
  const sortByFrequency = (items: string[], frequencyMap: FrequencyMap): string[] => {
    return Array.from(new Set(items))
      .sort((a, b) => (frequencyMap[b] || 0) - (frequencyMap[a] || 0))
  }

  // Fetch common games, locations and players on component mount
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        setError(null)
        setIsLoadingSuggestions(true)

        const { data: session, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw new Error('Failed to get user session')

        const user = session?.session?.user
        if (!user) throw new Error('No user session found')

        // Fetch all games for the user
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('id, name, location, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (gamesError) throw new Error('Failed to fetch games data')

        // Process game names
        const gameNameFrequency: FrequencyMap = {}
        gamesData?.forEach(game => {
          gameNameFrequency[game.name] = (gameNameFrequency[game.name] || 0) + 1
        })
        const sortedGameNames = sortByFrequency(
          gamesData?.map(game => game.name) || [],
          gameNameFrequency
        ).slice(0, 3)
        setCommonGameNames(sortedGameNames)

        // Process locations
        const locationFrequency: FrequencyMap = {}
        gamesData?.forEach(game => {
          locationFrequency[game.location] = (locationFrequency[game.location] || 0) + 1
        })
        const sortedLocations = sortByFrequency(
          gamesData?.map(game => game.location) || [],
          locationFrequency
        ).slice(0, 3)
        setCommonLocations(sortedLocations)

        // Fetch and process players
        if (gamesData && gamesData.length > 0) {
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('name, game_id')
            .in('game_id', gamesData.map(game => game.id))

          if (playerError) throw new Error('Failed to fetch players data')

          const playerFrequency: FrequencyMap = {}
          playerData?.forEach(player => {
            playerFrequency[player.name] = (playerFrequency[player.name] || 0) + 1
          })
          const sortedPlayers = sortByFrequency(
            playerData?.map(player => player.name) || [],
            playerFrequency
          ).slice(0, 6)
          setCommonPlayers(sortedPlayers)
        }

      } catch (error) {
        console.error('Error fetching user preferences:', error)
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    fetchUserPreferences()
  }, [])

  const handleAddPlayer = () => {
    setPlayers([...players, { name: '' }])
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
      setError('Please fill in all required fields')
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Game Setup</h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoadingSuggestions && (
          <div className="text-center text-gray-500 mb-4">
            Loading suggestions...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game Name Input with Suggestions */}
          <div>
            <label htmlFor="gameName" className="block mb-2 font-medium">
              Game Name
            </label>
            <div className="relative">
              <input
                id="gameName"
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter game name"
                list="gameNameSuggestions"
                required
              />
              <datalist id="gameNameSuggestions">
                {commonGameNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Location Input with Suggestions */}
          <div>
            <label htmlFor="location" className="block mb-2 font-medium">
              Location
            </label>
            <div className="relative">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter game location"
                list="locationSuggestions"
                required
              />
              <datalist id="locationSuggestions">
                {commonLocations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Players Inputs with Suggestions */}
          <div>
            <label className="block mb-2 font-medium">Players</label>
            {players.map((player, index) => (
              <div key={index} className="mb-2">
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updatePlayer(index, { name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={`Player ${index + 1} Name`}
                  list={`playerSuggestions${index}`}
                  required
                />
                <datalist id={`playerSuggestions${index}`}>
                  {commonPlayers.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
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
