'use client'

import { useState, useEffect, useRef } from 'react'
import { StadiaDebugger, type RobotJoints, type GamepadState } from '@/lib/gamepadDebug'
import { X, Gamepad2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpdateJointsDegrees, JointState } from '@/hooks/useRobotControl'
import { radiansToDegrees } from '@/lib/utils'

interface GamepadControlPanelProps {
  onClose: () => void
  updateJointsDegrees: UpdateJointsDegrees
  jointStates: JointState[]
  isConnected: boolean
  connectRobot: () => Promise<void>
  disconnectRobot: () => Promise<void>
}

export function GamepadControlPanel({ onClose, updateJointsDegrees, jointStates, isConnected, connectRobot, disconnectRobot }: GamepadControlPanelProps) {
  const [gamepadDebugger] = useState(() => new StadiaDebugger())
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [gamepadInfo, setGamepadInfo] = useState<string>('')
  const [isStadia, setIsStadia] = useState(false)
  const [currentJoints, setCurrentJoints] = useState<RobotJoints>({
    take_photo: 0,
    end_episode: 0
  })
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null)
  
  // Refs for latest values in the update loop
  const jointStatesRef = useRef(jointStates)
  const updateJointsDegreesRef = useRef(updateJointsDegrees)
  
  // Constants like keyboard control
  const GAMEPAD_UPDATE_STEP_DEGREES = 0.85  // Increased by 70% (was 0.5)
  const GAMEPAD_UPDATE_INTERVAL_MS = 16     // ~60fps
  
  // Safety collision zones for SO-101
  const checkCollisionSafety = (servoId: number, newValue: number, currentStates: JointState[]): boolean => {
    const getJointValue = (id: number) => {
      const joint = currentStates.find(j => j.servoId === id)
      return typeof joint?.degrees === 'number' ? joint.degrees : 180
    }
    
    const rotation = servoId === 1 ? newValue : getJointValue(1)     // Servo 1
    const pitch = servoId === 2 ? newValue : getJointValue(2)        // Servo 2  
    const elbow = servoId === 3 ? newValue : getJointValue(3)        // Servo 3
    const wristPitch = servoId === 4 ? newValue : getJointValue(4)   // Servo 4
    const wristRoll = servoId === 5 ? newValue : getJointValue(5)    // Servo 5
    
    // Zone 1: Empêcher le coude de rentrer dans l'épaule
    if (pitch < 120 && elbow > 220) {
      setCollisionWarning('Elbow → Shoulder collision')
      setTimeout(() => setCollisionWarning(null), 2000)
      return false
    }
    
    // Zone 2: Empêcher le poignet de toucher la base quand le bras est replié
    if (rotation < 100 && pitch < 110 && elbow > 200 && wristPitch > 250) {
      setCollisionWarning('Wrist → Base collision')
      setTimeout(() => setCollisionWarning(null), 2000)
      return false
    }
    
    // Zone 3: Position extrême dangereuse du coude
    if (elbow > 260 && pitch > 250) {
      setCollisionWarning('Extreme position avoided')
      setTimeout(() => setCollisionWarning(null), 2000)
      return false
    }
    
    // Zone 4: Éviter que le poignet touche le coude
    if (elbow > 200 && wristPitch > 260 && Math.abs(wristRoll - 180) > 90) {
      setCollisionWarning('Wrist → Elbow collision')
      setTimeout(() => setCollisionWarning(null), 2000)
      return false
    }
    
    return true // Position sûre
  }
  
  // Update refs when props change
  useEffect(() => {
    jointStatesRef.current = jointStates
  }, [jointStates])
  
  useEffect(() => {
    updateJointsDegreesRef.current = updateJointsDegrees
  }, [updateJointsDegrees])

  const checkGamepad = () => {
    const gamepad = gamepadDebugger.detectGamepad()
    if (gamepad) {
      setGamepadConnected(true)
      const stadiaDetected = gamepadDebugger.isStadiaController(gamepad)
      setIsStadia(stadiaDetected)
      setGamepadInfo(gamepad.id)
      return gamepad
    } else {
      setGamepadConnected(false)
      setGamepadInfo('')
      setIsStadia(false)
      return null
    }
  }
  
  useEffect(() => {
    if (!gamepadConnected) {
      checkGamepad()
      return
    }
    
    let intervalId: NodeJS.Timeout | null = null
    
    const updateJointsBasedOnGamepad = () => {
      const gamepad = gamepadDebugger.detectGamepad()
      if (!gamepad || !isConnected) return
      
      const joints = gamepadDebugger.mapToRobotJoints(gamepad)
      setCurrentJoints(joints)
      
      const currentJointStates = jointStatesRef.current
      const updates: { servoId: number; value: number }[] = []
      
      // Process physical servo commands with incremental movement
      Object.entries(joints).forEach(([key, velocity]) => {
        if (key === 'take_photo' || key === 'end_episode') {
          // Handle special functions
          if (key === 'take_photo' && velocity > 0) {
            console.log('📸 Take Photo triggered!')
            // TODO: Implement photo capture
          }
          if (key === 'end_episode' && velocity > 0) {
            console.log('🎬 End Episode triggered!')
            // TODO: Implement episode ending
          }
          return
        }
        
        const servoId = parseInt(key)
        const jointState = currentJointStates.find(j => j.servoId === servoId)
        if (!jointState || typeof jointState.degrees !== 'number') return
        
        let newValue = jointState.degrees
        
        // Apply incremental movement (like keyboard)
        if (Math.abs(velocity) > 0.01) {
          const increment = velocity * GAMEPAD_UPDATE_STEP_DEGREES
          newValue += increment
          
          // Apply limits like keyboard control
          const lowerLimit = Math.round(radiansToDegrees(jointState.limit?.lower ?? -Infinity))
          const upperLimit = Math.round(radiansToDegrees(jointState.limit?.upper ?? Infinity))
          newValue = Math.max(lowerLimit, Math.min(upperLimit, newValue))
          
          // Check collision safety before allowing movement (DISABLED - causing issues with start position)
          // if (!checkCollisionSafety(servoId, newValue, currentJointStates)) {
          //   return // Skip this movement - collision detected
          // }
          
          if (newValue !== jointState.degrees) {
            updates.push({ servoId, value: newValue })
          }
        }
      })
      
      // Send updates using the same system as keyboard
      if (updates.length > 0) {
        updateJointsDegreesRef.current(updates)
      }
    }
    
    // Start continuous update loop (like keyboard 3ms interval)
    intervalId = setInterval(updateJointsBasedOnGamepad, GAMEPAD_UPDATE_INTERVAL_MS)
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      gamepadDebugger.stop()
    }
  }, [gamepadConnected, isConnected])
  
  useEffect(() => {
    // Check gamepad periodically
    const interval = setInterval(checkGamepad, 1000)
    
    // Listen for gamepad events
    const handleConnect = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id)
      checkGamepad()
    }
    
    const handleDisconnect = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id)
      setGamepadConnected(false)
      setGamepadInfo('')
      setIsStadia(false)
    }
    
    window.addEventListener('gamepadconnected', handleConnect)
    window.addEventListener('gamepaddisconnected', handleDisconnect)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('gamepadconnected', handleConnect)
      window.removeEventListener('gamepaddisconnected', handleDisconnect)
      gamepadDebugger.stop()
    }
  }, [])
  
  return (
    <div className="absolute top-4 left-4 w-96 h-[calc(100vh-8rem)] bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <Gamepad2 className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Stadia Controller</h2>
          {gamepadConnected && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-400">Connected</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="p-4 h-full overflow-y-auto">
        {!gamepadConnected ? (
          // No gamepad connected
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 mb-6 opacity-50">
              🎮
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Gamepad Detected</h3>
            <p className="text-gray-400 mb-4 max-w-md">
              Connect your Stadia controller via Bluetooth and press any button to activate it.
            </p>
            <div className="text-sm text-gray-500">
              Make sure your controller is paired and press any button to wake it up.
            </div>
          </div>
        ) : (
          // Gamepad connected
          <div className="space-y-4">
            {/* Controller Info */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-base font-semibold text-white mb-2">Controller Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className={isStadia ? "text-green-400" : "text-yellow-400"}>
                    {isStadia ? "🎮 Stadia Controller" : "⚠️ Other Controller"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400">✅ Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Speed:</span>
                  <span className="text-blue-400">⚡ 53°/s (+70%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Safety:</span>
                  <span className="text-gray-500">🛡️ Disabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Robot:</span>
                  <span className={isConnected ? "text-green-400" : "text-red-400"}>
                    {isConnected ? "✅ Connected" : "❌ Disconnected"}
                  </span>
                </div>
              </div>
              
              {/* Robot Connection */}
              <div className="flex gap-2">
                {isConnected ? (
                  <Button 
                    onClick={disconnectRobot}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    Disconnect Robot
                  </Button>
                ) : (
                  <Button 
                    onClick={connectRobot}
                    variant="default"
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-500"
                  >
                    Connect Robot
                  </Button>
                )}
              </div>
              
              {!isStadia && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-300">
                    Non-Stadia controller detected. Button mapping may not work correctly.
                  </div>
                </div>
              )}
              
              {collisionWarning && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-300">
                    🚨 {collisionWarning}
                  </div>
                </div>
              )}
            </div>
            
            {/* Current Joint States */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-base font-semibold text-white mb-3">🤖 Joint States</h3>
              <div className="grid grid-cols-2 gap-2">
                {jointStates.filter(j => j.jointType === 'revolute').map((jointState) => {
                  const gamepadValue = currentJoints[jointState.servoId!] || 0
                  return (
                    <div key={jointState.servoId} className="bg-black/30 rounded p-2">
                      <div className="text-xs text-gray-400 mb-1">
                        {jointState.name}
                      </div>
                      <div className="text-xs font-mono text-white">
                        {typeof jointState.degrees === 'number' ? jointState.degrees.toFixed(1) + '°' : 'N/A'}
                      </div>
                      <div className={`text-xs font-mono ${Math.abs(gamepadValue) > 0.01 ? 'text-green-400' : 'text-gray-500'}`}>
                        Cmd: {gamepadValue.toFixed(3)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Control Mapping - Two Columns */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-base font-semibold text-white mb-3">🗺️ Controls</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-400 mb-2">Movement</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li><span className="text-white">Left Stick:</span> Wrist</li>
                    <li><span className="text-white">Right Stick:</span> Shoulder</li>
                    <li><span className="text-white">L1:</span> Elbow Down</li>
                    <li><span className="text-white">R1:</span> Elbow Up</li>
                    <li><span className="text-white">D-Pad:</span> Alt Control</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-green-400 mb-2">Actions</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li><span className="text-white">A:</span> Close Gripper</li>
                    <li><span className="text-white">B:</span> Open Gripper</li>
                    <li><span className="text-white">X:</span> Take Photo 📸</li>
                    <li><span className="text-white">Y:</span> End Episode 🎬</li>
                    <li><span className="text-gray-500">L2/R2:</span> Not mapped</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Special Functions Status */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-base font-semibold text-white mb-3">⚡ Special Functions</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded border ${currentJoints.take_photo > 0 ? 'bg-blue-500/20 border-blue-400' : 'bg-black/30 border-gray-600'}`}>
                  <div className="text-center">
                    <div className="text-xl mb-1">📸</div>
                    <div className="text-xs text-gray-300">Photo</div>
                    <div className="text-xs text-gray-500">X</div>
                  </div>
                </div>
                
                <div className={`p-2 rounded border ${currentJoints.end_episode > 0 ? 'bg-red-500/20 border-red-400' : 'bg-black/30 border-gray-600'}`}>
                  <div className="text-center">
                    <div className="text-xl mb-1">🎬</div>
                    <div className="text-xs text-gray-300">Episode</div>
                    <div className="text-xs text-gray-500">Y</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}