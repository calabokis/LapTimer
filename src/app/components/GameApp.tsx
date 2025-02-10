'use client'

import React, { useState } from 'react'
import GameSetup from './GameSetup'
import GameTimer from './GameTimer'

export default function GameApp() {
  const [isGameStarted, setIsGameStarted] = useState(false)

  const handleGameStart = () => {
    setIsGameStarted(true)
  }

  const handleGameReset = () => {
    setIsGameStarted(false)
  }

  return (
    <div>
      {!isGameStarted ? (
        <GameSetup onGameStart={handleGameStart} />
      ) : (
        <GameTimer onReset={handleGameReset} />
      )}
    </div>
  )
}