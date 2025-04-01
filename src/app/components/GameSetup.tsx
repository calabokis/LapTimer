'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'

interface GameTemplate {
  id: string
  name: string
  sides: Array<{
    name: string
    icon?: string
  }>
}

interface PlayerSetup {
  name: string
  side?: string
  sideIcon?: string
  color?: string
  backgroundImage?: string
}

interface TemplateSide {
  name: string;
  icon?: string;
  previewUrl?: string | null;
}

interface GameSetupProps {
  onGameStart: (gameInfo: {
    gameName: string
    location: string
    notes: string
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

// Maximum file size: 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024;

export default function GameSetup({ onGameStart }: GameSetupProps) {
  const [gameName, setGameName] = useState('')
  const [gameNotes, setGameNotes] = useState('')
  const [location, setLocation] = useState('')
  const [players, setPlayers] = useState<PlayerSetup[]>([
    { name: '', side: '', color: playerColors[0].value }
  ])
  const [showGameModal, setShowGameModal] = useState(false)
  const [gameTemplates, setGameTemplates] = useState<GameTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showSideDropdown, setShowSideDropdown] = useState<number | null>(null);

  // State for the Add/Edit Game modal
  const [templateName, setTemplateName] = useState('')
  const [templateSides, setTemplateSides] = useState<TemplateSide[]>([])
  const [currentSide, setCurrentSide] = useState('')
  const [currentSideIcon, setCurrentSideIcon] = useState<File | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [sideIconPreview, setSideIconPreview] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use a different approach for player backgrounds
  const getBackgroundInputId = (index: number) => `player-bg-input-${index}`;

  const openBackgroundFileDialog = (index: number) => {
    const fileInput = document.getElementById(getBackgroundInputId(index)) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

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

      console.log('Fetched templates:', templates);

      // For each template, fetch its sides
      const templatesWithSides = await Promise.all(
        templates.map(async (template) => {
          const { data: sides, error: sidesError } = await supabase
            .from('game_template_sides')
            .select('side_name, icon_url')
            .eq('template_id', template.id)
            .order('created_at')

          if (sidesError) throw sidesError

          console.log(`Template ${template.name} sides:`, sides);

          return {
            id: template.id,
            name: template.name,
            sides: sides.map(s => ({
              name: s.side_name,
              icon: s.icon_url
            }))
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

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>, playerIndex: number) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size exceeds the limit (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        e.target.value = '';
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        e.target.value = '';
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result as string);

        // Upload to Supabase
        uploadPlayerBackground(file, playerIndex);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to upload background image to Supabase
  const uploadPlayerBackground = async (file: File, playerIndex: number) => {
    try {
      const fileName = `player-bg-${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from('player-backgrounds')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('player-backgrounds')
        .getPublicUrl(fileName);

      const backgroundUrl = publicUrlData.publicUrl;
      console.log('Uploaded background URL:', backgroundUrl);

      // Update player with background image URL
      const newPlayers = [...players];
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        backgroundImage: backgroundUrl
      };
      setPlayers(newPlayers);
    } catch (error) {
      console.error('Error uploading player background:', error);
      alert('Failed to upload background image. Please try again.');
    }
  }

  const handleAddPlayer = () => {
    // Filter out colors that are already used by other players
    const usedColors = players.map(p => p.color);
    const availableColors = playerColors.filter(color => !usedColors.includes(color.value));

    // Get the first available color or default to the first color if all are used
    const nextColor = availableColors.length > 0
      ? availableColors[0].value
      : playerColors[0].value;

    setPlayers([...players, { name: '', side: '', color: nextColor }])
  }

  const handleRemovePlayer = (index: number) => {
    const newPlayers = [...players]
    newPlayers.splice(index, 1)
    setPlayers(newPlayers)
  }

  const updatePlayer = (index: number, updates: Partial<PlayerSetup>) => {
    const newPlayers = [...players]

    // If trying to update the color, check if that color is already used
    if (updates.color) {
      const colorInUse = players.some((player, idx) =>
        player.color === updates.color && idx !== index
      );

      if (colorInUse) {
        alert('This color is already used by another player');
        return;
      }
    }

    // If trying to update the side, check if that side is already used
    if (updates.side) {
      const sideInUse = players.some((player, idx) =>
        player.side === updates.side && idx !== index
      );

      if (sideInUse) {
        alert('This side is already chosen by another player');
        return;
      }

      // Find the matching side to get its icon URL
      if (selectedTemplateId) {
        const template = gameTemplates.find(t => t.id === selectedTemplateId);
        if (template) {
          const side = template.sides.find(s => s.name === updates.side);
          if (side && side.icon) {
            updates.sideIcon = side.icon;
          }
        }
      }
    }

    // Apply updates
    newPlayers[index] = { ...newPlayers[index], ...updates }
    setPlayers(newPlayers)

    // Close side dropdown after selection
    if (updates.side) {
      setShowSideDropdown(null);
    }
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
      notes: gameNotes,
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
    // If a template is selected and the button should be "Edit"
    if (selectedTemplateId) {
      const template = gameTemplates.find(t => t.id === selectedTemplateId)
      if (template) {
        setTemplateName(template.name)
        // Convert the sides to the TemplateSide format
        setTemplateSides(template.sides.map(side => ({
          name: side.name,
          icon: side.icon
        })))
        setCurrentSide('')
        setCurrentSideIcon(null)
        setSideIconPreview(null)
        setEditingTemplateId(selectedTemplateId)
        setShowGameModal(true)
      }
    } else {
      // New template
      setTemplateName('')
      setTemplateSides([])
      setCurrentSide('')
      setCurrentSideIcon(null)
      setSideIconPreview(null)
      setEditingTemplateId(null)
      setShowGameModal(true)
    }
  }

  const handleCloseGameModal = () => {
    setShowGameModal(false)
  }

  const handleSideIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size exceeds the limit (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setCurrentSideIcon(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSideIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  const handleAddTemplateSide = async () => {
    if (currentSide.trim() === '') return;

    if (templateSides.some(side => side.name === currentSide.trim())) {
      alert('This side name is already added');
      return;
    }

    let iconUrl = undefined;
    const previewUrl = sideIconPreview; // Store the current preview

    // Upload icon if exists
    if (currentSideIcon) {
      try {
        const fileName = `side-icon-${Date.now()}-${currentSideIcon.name}`;

        const { error } = await supabase.storage
          .from('side-icons')
          .upload(fileName, currentSideIcon, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Storage upload error:', error);
          throw error;
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('side-icons')
          .getPublicUrl(fileName);

        iconUrl = publicUrlData.publicUrl;
        console.log('Uploaded icon URL:', iconUrl);
      } catch (error) {
        console.error('Error uploading icon:', error);
        alert('Failed to upload icon. Please try again.');
        return;
      }
    }

    // Important: Add the new side BEFORE clearing the input states
    setTemplateSides([...templateSides, {
      name: currentSide.trim(),
      icon: iconUrl,
      previewUrl: previewUrl
    }]);

    // NOW reset inputs for the next side
    setCurrentSide('');
    setCurrentSideIcon(null);
    setSideIconPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleRemoveTemplateSide = (sideName: string) => {
    setTemplateSides(templateSides.filter(side => side.name !== sideName))
  }

  const handleSaveTemplate = async () => {
    if (templateName.trim() === '') {
      alert('Please enter a game name');
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (editingTemplateId) {
        // Update existing template
        console.log('Updating template:', editingTemplateId);

        const { error: updateError } = await supabase
          .from('game_templates')
          .update({
            name: templateName,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplateId);

        if (updateError) {
          console.error('Update template error:', updateError);
          throw updateError;
        }

        // Delete existing sides
        const { error: deleteError } = await supabase
          .from('game_template_sides')
          .delete()
          .eq('template_id', editingTemplateId);

        if (deleteError) {
          console.error('Delete sides error:', deleteError);
          throw deleteError;
        }

        // Add new sides if any
        if (templateSides.length > 0) {
          const { error: sidesError } = await supabase
            .from('game_template_sides')
            .insert(templateSides.map(side => ({
              template_id: editingTemplateId,
              side_name: side.name,
              icon_url: side.icon || null
            })));

          if (sidesError) {
            console.error('Insert sides error:', sidesError);
            throw sidesError;
          }
        }
      } else {
        // Create new template
        console.log('Creating new template');

        const { data: template, error: templateError } = await supabase
          .from('game_templates')
          .insert({
            name: templateName,
            user_id: userId
          })
          .select()
          .single();

        if (templateError) {
          console.error('Create template error:', templateError);
          throw templateError;
        }

        // Add sides if any
        if (templateSides.length > 0 && template) {
          const { error: sidesError } = await supabase
            .from('game_template_sides')
            .insert(templateSides.map(side => ({
              template_id: template.id,
              side_name: side.name,
              icon_url: side.icon || null
            })));

          if (sidesError) {
            console.error('Insert sides error:', sidesError);
            throw sidesError;
          }
        }
      }

      // Refresh templates and close modal
      await fetchGameTemplates();
      setShowGameModal(false);
    } catch (error) {
      console.error('Error saving game template:', error);

      // Safe error message extraction
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }

      alert(`Failed to save game template: ${errorMessage}`);
    }
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
          {/* Game Selection with Add/Edit button */}
          <div className="flex items-end space-x-2">
            <div className="flex-grow">
              <label htmlFor="gameSelect" className="block mb-2 font-medium">
                Game
              </label>
              <select
                id="gameSelect"
                value={selectedTemplateId || ''}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select Game</option>
                {gameTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={openAddGameModal}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {selectedTemplateId ? 'Edit' : 'Add'}
            </button>
          </div>

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

          {/* Game Notes Input */}
          <div>
            <label htmlFor="gameNotes" className="block mb-2 font-medium">
              Game Notes
            </label>
            <textarea
              id="gameNotes"
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter game notes"
            />
          </div>

          {/* Location Input */}
          <div>
            <label htmlFor="location" className="block mb-2 font-medium">
              Location
            </label>
            <div className="flex items-end space-x-2">
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
          </div>

          {/* Players Inputs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-medium">Players</label>
              <button
                type="button"
                onClick={handleAddPlayer}
                className="text-blue-500 hover:text-blue-700 text-2xl font-bold"
                title="Add Player"
              >
                +
              </button>
            </div>

            {players.map((player, index) => (
              <div
                key={index}
                className="mb-4 p-3 border rounded-lg relative"
                style={{
                  backgroundColor: player.color,
                  backgroundImage: player.backgroundImage ? `url(${player.backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Player name input */}
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updatePlayer(index, { name: e.target.value })}
                  className="w-full px-3 py-2 mb-3 border rounded-lg"
                  placeholder={`Player ${index + 1}`}
                  required
                />

                {/* Side Selection */}
                <div className="relative">
                  <label className="block mb-1 text-sm">
                    Side
                  </label>
                  <select
                    value={player.side || ''}
                    onChange={(e) => updatePlayer(index, { side: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!selectedTemplateId || gameTemplates.find(t => t.id === selectedTemplateId)?.sides.length === 0}
                  >
                    <option value="">Select Side</option>
                    {selectedTemplateId &&
                      gameTemplates
                        .find(t => t.id === selectedTemplateId)
                        ?.sides
                        .filter(side =>
                          !players.some(p => p.side === side.name && p !== player)
                        )
                        .map((side) => (
                          <option key={side.name} value={side.name}>
                            {side.name}
                          </option>
                        ))
                    }
                  </select>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block mb-1 text-sm">
                    Player Color
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {playerColors.map((color) => {
                      // Check if this color is already selected by another player
                      const isUsedByOther = players.some(
                        (p, pidx) => p.color === color.value && pidx !== index
                      );

                      return (
                        <button
                          key={color.name}
                          type="button"
                          title={color.name}
                          disabled={isUsedByOther}
                          onClick={() => updatePlayer(index, { color: color.value })}
                          className={`w-6 h-6 rounded-full border ${
                            player.color === color.value ? 'ring-2 ring-blue-500' : ''
                          } ${isUsedByOther ? 'opacity-30 cursor-not-allowed' : ''}`}
                          style={{ backgroundColor: color.value }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Background Image Upload */}
                <div className="mt-2">
                  <label className="block mb-1 text-sm">
                    Player Background
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openBackgroundFileDialog(index)}
                      className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      Set Background
                    </button>
                    <input
                      type="file"
                      id={getBackgroundInputId(index)}
                      onChange={(e) => handleBackgroundImageChange(e, index)}
                      accept="image/*"
                      className="hidden"
                    />
                    {player.backgroundImage && (
                      <>
                        <span className="text-xs text-green-600">✓ Image set</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newPlayers = [...players];
                            newPlayers[index] = {
                              ...newPlayers[index],
                              backgroundImage: undefined
                            };
                            setPlayers(newPlayers);
                          }}
                          className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                          title="Remove background"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </>
                    )}
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

              {/* Sides Input with Icon Upload */}
              <div>
                <label className="block mb-2 font-medium">Sides</label>
                <div className="space-y-2">
                  <div className="flex space-x-2 mb-2 relative">
                  <input
                    type="text"
                    value={currentSide}
                    onChange={(e) => setCurrentSide(e.target.value)}
                    className="flex-grow px-3 py-2 border rounded-lg"
                    placeholder="Enter side name"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 border rounded-lg bg-gray-100 hover:bg-gray-200"
                    title="Upload Icon"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSideIconChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Icon Preview */}
                {sideIconPreview && (
                  <div className="flex items-center space-x-2">
                    <Image
                      src={sideIconPreview}
                      alt="Icon Preview"
                      width={40}
                      height={40}
                      className="object-contain border rounded"
                    />
                    <span className="text-sm text-gray-600">Icon Preview</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddTemplateSide}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add Side
                </button>
              </div>

              {/* Side List */}
              <div className="mt-4 space-y-2">
                {templateSides.map((side, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {(side.icon || side.previewUrl) && (
                        <Image
                          src={side.icon || side.previewUrl || ''}
                          alt={side.name}
                          width={24}
                          height={24}
                          className="object-contain"
                          onError={(e) => {
                            console.error('Error loading image:', side.icon || side.previewUrl);
                            // Fallback to a placeholder if image fails to load
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const letter = document.createElement('span');
                              letter.className = 'w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-sm font-bold';
                              letter.innerText = side.name.charAt(0).toUpperCase();
                              parent.prepend(letter);
                            }
                          }}
                        />
                      )}
                      <span>{side.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTemplateSide(side.name)}
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
);
}
