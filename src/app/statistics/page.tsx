'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

interface GameStats {
  id: string
  name: string
  location: string
  notes: string
  created_at: string
  players: {
    id: string
    name: string
    side: string
    total_vp: number
  }[]
  vp_history: {
    player_name: string
    vp_changes: number[]
  }[]
  total_turns: number
  total_time: number
}

export default function StatisticsPage() {
  const [games, setGames] = useState<GameStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('game') // 'game', 'location', 'player'

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      setLoading(true)
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('id, name, location, notes, created_at, total_elapsed_time')
        .order('created_at', { ascending: false })

      if (gamesError) throw gamesError

      // For each game, get its players and VP history
      const gamesWithDetails = await Promise.all(
        gamesData.map(async (game) => {
          // Get players
          const { data: playersData } = await supabase
            .from('players')
            .select('id, name, side, total_vp')
            .eq('game_id', game.id)

          // Get VP history from vp_changes
          const { data: vpData } = await supabase
            .from('vp_changes')
            .select('player_id, vp_amount')
            .eq('game_id', game.id)

          // Group VP changes by player
          const vpHistory = playersData?.map(player => {
            const playerVpChanges = vpData?.filter(vp => vp.player_id === player.id) || []
            return {
              player_name: player.name,
              vp_changes: playerVpChanges.map(vp => vp.vp_amount)
            }
          }) || []

          // Get turn count
          const { count: turnCount } = await supabase
            .from('turns')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', game.id)

          return {
            ...game,
            players: playersData || [],
            vp_history: vpHistory,
            total_turns: turnCount || 0,
            total_time: game.total_elapsed_time
          }
        })
      )

      setGames(gamesWithDetails)
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGames = games.filter(game => {
    if (!searchTerm) return true
    
    const lowerSearchTerm = searchTerm.toLowerCase()
    
    if (filterType === 'game') {
      return game.name.toLowerCase().includes(lowerSearchTerm)
    }
    
    if (filterType === 'location') {
      return game.location.toLowerCase().includes(lowerSearchTerm)
    }
    
    if (filterType === 'player') {
      return game.players.some(player => 
        player.name.toLowerCase().includes(lowerSearchTerm) ||
        (player.side && player.side.toLowerCase().includes(lowerSearchTerm))
      )
    }
    
    return true
  })

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Game Statistics</h1>
          <Link 
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Timer
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="game">Game</option>
                <option value="location">Location</option>
                <option value="player">Player</option>
              </select>
              <button
                onClick={fetchGames}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading games...</p>
            </div>
          ) : (
            <>
              {filteredGames.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No games found matching your search.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredGames.map(game => (
                    <div key={game.id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-800">{game.name}</h2>
                          <p className="text-gray-600">{game.location} • {formatDate(game.created_at)}</p>
                          {game.notes && <p className="text-gray-700 mt-2">{game.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="font-medium">Total Time: {formatTime(game.total_time)}</p>
                          <p className="text-gray-600">Turns: {game.total_turns}</p>
                        </div>
                      </div>
                      
                      <h3 className="font-medium text-gray-700 mb-2">Players</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {game.players.map(player => (
                          <div key={player.id} className="bg-gray-50 rounded p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{player.name}</p>
                              {player.side && <p className="text-sm text-gray-600">{player.side}</p>}
                            </div>
                            <div className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded">
                              {player.total_vp} VP
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
