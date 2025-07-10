'use client'

import { useEffect, useRef, useCallback } from 'react'

interface GamepadMapping {
  [key: string]: {
    joint: string
    scale?: number
    value?: number
  }
}

// Stadia controller specific mappings based on your documentation
export const STADIA_MAPPING: GamepadMapping = {
  // Analog axes (sticks and triggers)
  'axis_0': { joint: 'wrist_roll', scale: 1.0 },      // Left stick X
  'axis_1': { joint: 'wrist_flex', scale: -1.0 },     // Left stick Y (inverted)
  'axis_2': { joint: 'shoulder_pan', scale: 1.0 },    // Right stick X  
  'axis_3': { joint: 'shoulder_lift', scale: -1.0 },  // Right stick Y (inverted)
  'axis_4': { joint: 'gripper', scale: -1.0 },        // L2 trigger (close)
  'axis_5': { joint: 'gripper', scale: 1.0 },         // R2 trigger (open)
  
  // Digital buttons
  'button_9': { joint: 'elbow_flex', value: -1.0 },   // L1 (down)
  'button_10': { joint: 'elbow_flex', value: 1.0 },   // R1 (up)
  
  // Face buttons for alternative control
  'button_0': { joint: 'wrist_flex', value: -1.0 },   // A (down)
  'button_3': { joint: 'wrist_flex', value: 1.0 },    // Y (up)
  'button_2': { joint: 'wrist_roll', value: -1.0 },   // X (left)
  'button_1': { joint: 'wrist_roll', value: 1.0 },    // B (right)
  
  // D-pad
  'button_12': { joint: 'shoulder_lift', value: 1.0 },   // D-Up
  'button_13': { joint: 'shoulder_lift', value: -1.0 },  // D-Down
  'button_14': { joint: 'shoulder_pan', value: -1.0 },   // D-Left
  'button_15': { joint: 'shoulder_pan', value: 1.0 },    // D-Right
}

interface UseGamepadControlOptions {
  onJointCommand: (commands: Record<string, number>) => void
  deadzone?: number
  triggerThreshold?: number
  enabled?: boolean
  mapping?: GamepadMapping
}

export function useGamepadControl({
  onJointCommand,
  deadzone = 0.15,
  triggerThreshold = 0.05,
  enabled = true,
  mapping = STADIA_MAPPING
}: UseGamepadControlOptions) {
  const animationFrameRef = useRef<number>()
  const lastCommandsRef = useRef<Record<string, number>>({})
  const gamepadStateRef = useRef<{
    connected: boolean
    id: string | null
    lastTimestamp: number
  }>({
    connected: false,
    id: null,
    lastTimestamp: 0
  })
  
  const applyDeadzone = useCallback((value: number): number => {
    if (Math.abs(value) < deadzone) return 0
    const sign = value > 0 ? 1 : -1
    return sign * (Math.abs(value) - deadzone) / (1.0 - deadzone)
  }, [deadzone])
  
  const processGamepadInput = useCallback((gamepad: Gamepad) => {
    const commands: Record<string, number> = {}
    
    // Process analog axes
    gamepad.axes.forEach((value, index) => {
      const key = `axis_${index}`
      const mapEntry = mapping[key]
      if (!mapEntry || !('scale' in mapEntry)) return
      
      let processedValue = value
      
      // Apply deadzone for stick axes (0-3)
      if (index < 4) {
        processedValue = applyDeadzone(value)
      }
      
      // Handle trigger axes (4-5) - convert [-1,1] to [0,1]
      if (index >= 4) {
        processedValue = (value + 1) / 2
        if (processedValue < triggerThreshold) processedValue = 0
      }
      
      if (Math.abs(processedValue) > 0) {
        const command = processedValue * mapEntry.scale
        const joint = mapEntry.joint
        
        // Accumulate gripper commands (L2 + R2)
        if (joint === 'gripper') {
          commands[joint] = (commands[joint] || 0) + command
        } else {
          commands[joint] = command
        }
      }
    })
    
    // Process digital buttons
    gamepad.buttons.forEach((button, index) => {
      if (!button.pressed) return
      
      const key = `button_${index}`
      const mapEntry = mapping[key]
      if (!mapEntry || !('value' in mapEntry)) return
      
      commands[mapEntry.joint] = mapEntry.value
    })
    
    // Clamp gripper values
    if (commands.gripper) {
      commands.gripper = Math.max(-1, Math.min(1, commands.gripper))
    }
    
    // Only send if commands changed
    const hasChanged = Object.keys(commands).some(
      joint => commands[joint] !== (lastCommandsRef.current[joint] || 0)
    ) || Object.keys(commands).length !== Object.keys(lastCommandsRef.current).length
    
    if (hasChanged) {
      lastCommandsRef.current = { ...commands }
      onJointCommand(commands)
    }
  }, [mapping, applyDeadzone, triggerThreshold, onJointCommand])
  
  const pollGamepad = useCallback(() => {
    if (!enabled) {
      animationFrameRef.current = requestAnimationFrame(pollGamepad)
      return
    }
    
    const gamepads = navigator.getGamepads()
    const gamepad = Array.from(gamepads).find(gp => gp !== null)
    
    if (!gamepad) {
      if (gamepadStateRef.current.connected) {
        console.log('Gamepad disconnected')
        gamepadStateRef.current = { connected: false, id: null, lastTimestamp: 0 }
        lastCommandsRef.current = {}
        onJointCommand({}) // Send empty commands to stop robot
      }
    } else {
      // Check if this is a new gamepad or reconnection
      if (!gamepadStateRef.current.connected || gamepadStateRef.current.id !== gamepad.id) {
        console.log('Gamepad connected:', gamepad.id)
        gamepadStateRef.current = {
          connected: true,
          id: gamepad.id,
          lastTimestamp: gamepad.timestamp
        }
      }
      
      // Only process if gamepad state has updated
      if (gamepad.timestamp !== gamepadStateRef.current.lastTimestamp) {
        gamepadStateRef.current.lastTimestamp = gamepad.timestamp
        processGamepadInput(gamepad)
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(pollGamepad)
  }, [enabled, processGamepadInput, onJointCommand])
  
  useEffect(() => {
    // Start polling loop
    animationFrameRef.current = requestAnimationFrame(pollGamepad)
    
    // Listen for gamepad events
    const handleGamepadConnected = (event: GamepadEvent) => {
      console.log('Gamepad connected event:', event.gamepad.id)
    }
    
    const handleGamepadDisconnected = (event: GamepadEvent) => {
      console.log('Gamepad disconnected event:', event.gamepad.id)
    }
    
    window.addEventListener('gamepadconnected', handleGamepadConnected)
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('gamepadconnected', handleGamepadConnected)
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected)
    }
  }, [pollGamepad])
  
  return {
    isConnected: gamepadStateRef.current.connected,
    gamepadId: gamepadStateRef.current.id
  }
}