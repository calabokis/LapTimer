'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface GameTemplate {
  id: string
  name: string
  sides: string[]
}

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

// Vibrant colors for board games
const playerColors = [
  { name: 'Red', value: '#FF3B30' },
  { name: 'Blue', value: '#007AFF' },
  { name: 'Green', value: '#34C759' },
  { name: 'Yellow', value: '#FFCC00' },
  { name: 'Purple', value: '#AF52DE' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Teal', value: '#5AC8FA' },
  { name: 'Pink', value: '#FF2D55' },
  { name: 'Lime', value: '#B0FD6D' },
  { name: 'Brown', value: '#A2845E' },
]

export default function GameSetup({ onGameStart }: GameSetupProps) {
  const [gameName, setGameName] = useState('')
  const [location, setLocation] = useState('')
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { name: '', side: '', color: playerColors[0].value }
  ])
  const [showGameModal, setShowGameModal] = useState(false)
  const [gameTemplates, setGameTemplates] = useState<GameTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // State for the Add/Edit Game modal
  const [templateName, setTemplateName] = useState('')
  const [templateSides, setTemplateSides] = useState<string[]>([])
  const [currentSide, setCurrentSide] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Fetch game templates on component mount
  useEffect(() => {
    fetchGameTemplates()
  }, [])

  const fetchGameTemplates = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('game_templates')
        .select('id, name')
        .order('name')

      if (error) throw error

      // For each template, fetch its sides
      const templatesWithSides = await Promise.all(
        templates.map(async (template) => {
          const { data: sides, error: sidesError } = await supabase
            .from('game_template_sides')
            .select('side_name')
            .eq('template_id', template.id)
            .order('created_at')

          if (sidesError) throw sidesError

          return {
            id: template.id,
            name: template.name,
            sides: sides.map(s => s.side_name)
          }
        })
      )

      setGameTemplates(templatesWithSides)
    } catch (error) {
      console.error('Error fetching game templates:', error)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)

    const selectedTemplate = gameTemplates.find(t => t.id === templateId)
    if (selectedTemplate) {
      setGameName(selectedTemplate.name)
    }
  }

  const handleAddPlayer = () => {
    const nextColorIndex = players.length % playerColors.length;
    setPlayers([...players, { name: '', side: '', color: playerColors[nextColorIndex].value }])
  }

  const handleRemovePlayer = (index: number) => {
    const newPlayers = [...players]
    newPlayers.splice(index, 1)
    setPlayers(newPlayers)
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const openAddGameModal = () => {
    setTemplateName('')
    setTemplateSides([])
    setCurrentSide('')
    setEditingTemplateId(null)
    setShowGameModal(true)
  }

  // We'll keep this function but add a way to use it from the dropdown
  const handleGameEdit = (templateId: string) => {
    const template = gameTemplates.find(t => t.id === templateId)
    if (template) {
      setTemplateName(template.name)
      setTemplateSides([...template.sides])
      setCurrentSide('')
      setEditingTemplateId(templateId)
      setShowGameModal(true)
    }
  }

  const handleCloseGameModal = () => {
    setShowGameModal(false)
  }

  const handleAddTemplateSide = () => {
    if (currentSide.trim() === '') return

    if (!templateSides.includes(currentSide.trim())) {
      setTemplateSides([...templateSides, currentSide.trim()])
    }
    setCurrentSide('')
  }

  const handleRemoveTemplateSide = (side: string) => {
    setTemplateSides(templateSides.filter(s => s !== side))
  }

  const handleSaveTemplate = async () => {
    if (templateName.trim() === '') {
      alert('Please enter a game name')
      return
    }

    try {
      if (editingTemplateId) {
        // Update existing template
        const { error: updateError } = await supabase
          .from('game_templates')
          .update({
            name: templateName,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplateId)

        if (updateError) throw updateError

        // Delete existing sides
        const { error: deleteError } = await supabase
          .from('game_template_sides')
          .delete()
          .eq('template_id', editingTemplateId)

        if (deleteError) throw deleteError

        // Add new sides if any
        if (templateSides.length > 0) {
          const { error: sidesError } = await supabase
            .from('game_template_sides')
            .insert(templateSides.map(side => ({
              template_id: editingTemplateId,
              side_name: side
            })))

          if (sidesError) throw sidesError
        }
      } else {
        // Create new template
        const { data: template, error: templateError } = await supabase
          .from('game_templates')
          .insert({
            name: templateName,
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single()

        if (templateError) throw templateError

        // Add sides if any
        if (templateSides.length > 0) {
          const { error: sidesError } = await supabase
            .from('game_template_sides')
            .insert(templateSides.map(side => ({
              template_id: template.id,
              side_name: side
            })))

          if (sidesError) throw sidesError
        }
      }

      // Refresh templates and close modal
      await fetchGameTemplates()
      setShowGameModal(false)
    } catch (error) {
      console.error('Error saving game template:', error)
      alert('Failed to save game template. Please try again.')
    }
  }

  // Get available sides for the selected template
  const getAvailableSides = (): string[] => {
    if (!selectedTemplateId) return []

    const template = gameTemplates.find(t => t.id === selectedTemplateId)
    return template ? template.sides : []
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md relative">
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="absolute top-4 right-4 p-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          title="Sign Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>

        <h1 className="text-2xl font-bold mb-6 text-center">Game Setup</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game Selection */}
          <div className="flex space-x-2">
            <div className="flex-grow">
              <label htmlFor="gameSelect" className="block mb-2 font-medium">
                Game
              </label>
              <select
                id="gameSelect"
                value={selectedTemplateId || ''}
                onChange={(e) => {
                  if (e.target.value === 'edit' && selectedTemplateId) {
                    // If "Edit" is selected and we have a template selected
                    handleGameEdit(selectedTemplateId);
                  } else {
                    handleTemplateSelect(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select Game</option>
                {gameTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
                {selectedTemplateId && (
                  <option value="edit">Edit {gameTemplates.find(t => t.id === selectedTemplateId)?.name}</option>
                )}
              </select>
            </div>
            <div className="pt-8">
              <button
                type="button"
                onClick={openAddGameModal}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add/Edit Game
              </button>
            </div>
          </div>

          {/* Custom Game Name Input if needed */}
          {!selectedTemplateId && (
            <div>
              <label htmlFor="customGameName" className="block mb-2 font-medium">
                Custom Game Name
              </label>
              <input
                id="customGameName"
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter custom game name"
                required={!selectedTemplateId}
              />
            </div>
          )}

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

          {/* Players Inputs */}
          <div>
            <label className="block mb-2 font-medium">Players</label>
            {players.map((player, index) => (
              <div key={index} className="mb-4 p-3 border rounded-lg relative" style={{ backgroundColor: player.color }}>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayer(index, { name: e.target.value })}
                    className="flex-grow px-3 py-2 border rounded-lg bg-white"
                    placeholder={`Player ${index + 1} Name`}
                    required
                  />

                  {getAvailableSides().length > 0 && (
                    <select
                      value={player.side || ''}
                      onChange={(e) => updatePlayer(index, { side: e.target.value })}
                      className="px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">Select Side</option>
                      {getAvailableSides().map((side) => (
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

                {/* Remove Player Button */}
                {players.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Remove Player"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
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

      {/* Add/Edit Game Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
            {/* Close Button */}
            <button
              onClick={handleCloseGameModal}
              className="absolute top-4 right-4 p-1 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 className="text-xl font-bold mb-4">
              {editingTemplateId ? 'Edit Game' : 'Add New Game'}
            </h2>

            <div className="space-y-4">
              {/* Game Name Input */}
              <div>
                <label htmlFor="templateName" className="block mb-2 font-medium">
                  Name
                </label>
                <input
                  id="templateName"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter game name"
                  required
                />
              </div>

              {/* Sides Input */}
              <div>
                <label className="block mb-2 font-medium">Sides</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={currentSide}
                    onChange={(e) => setCurrentSide(e.target.value)}
                    className="flex-grow px-3 py-2 border rounded-lg"
                    placeholder="Enter side name"
                  />
                  <button
                    type="button"
                    onClick={handleAddTemplateSide}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>

                {/* Side List */}
                <div className="mt-2 space-y-2">
                  {templateSides.map((side, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded-lg">
                      <span>{side}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTemplateSide(side)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold mt-4"
              >
                Save Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
