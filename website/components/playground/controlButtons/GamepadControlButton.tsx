'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { StadiaDebugger } from '@/lib/gamepadDebug'

interface GamepadControlButtonProps {
  isActive: boolean
  onClick: () => void
}

export function GamepadControlButton({ isActive, onClick }: GamepadControlButtonProps) {
  const [isGamepadConnected, setIsGamepadConnected] = useState(false)
  const [gamepadDebugger] = useState(() => new StadiaDebugger())
  
  // Check for gamepad connection
  useEffect(() => {
    const checkGamepad = () => {
      const gamepad = gamepadDebugger.detectGamepad()
      setIsGamepadConnected(!!gamepad)
    }
    
    // Check immediately and then periodically
    checkGamepad()
    const interval = setInterval(checkGamepad, 1000)
    
    // Listen for gamepad events
    const handleConnect = () => {
      setIsGamepadConnected(true)
    }
    
    const handleDisconnect = () => {
      setIsGamepadConnected(false)
    }
    
    window.addEventListener('gamepadconnected', handleConnect)
    window.addEventListener('gamepaddisconnected', handleDisconnect)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('gamepadconnected', handleConnect)
      window.removeEventListener('gamepaddisconnected', handleDisconnect)
    }
  }, [gamepadDebugger])
  
  // Only show button if gamepad is connected
  if (!isGamepadConnected) {
    return null
  }
  
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={`relative transition-all duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
      }`}
      title="Gamepad Control (Stadia Controller)"
    >
      <div className="flex items-center space-x-2">
        <div className="text-lg">🎮</div>
        <span className="hidden sm:inline text-sm font-medium">Gamepad</span>
      </div>
      
      {/* Connection indicator */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
    </Button>
  )
}