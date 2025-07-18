'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Stadia Controller mapping based on your documentation
const STADIA_CONTROLLER_MAP = {
  // Face buttons (match your documentation)
  0: 'A',        // Face Bottom (cross/A)  
  1: 'B',        // Face Right (circle/B)
  2: 'X',        // Face Left (square/X)
  3: 'Y',        // Face Top (triangle/Y)
  
  // Shoulder buttons
  4: 'L1',       // Left Bumper
  5: 'R1',       // Right Bumper
  6: 'L2',       // Left Trigger (button)
  7: 'R2',       // Right Trigger (button)
  
  // Menu buttons
  8: 'Select',   // Select/Back
  9: 'Start',    // Start/Menu
  
  // Stick clicks
  10: 'L3',      // Left stick click
  11: 'R3',      // Right stick click
  
  // D-pad
  12: 'DPad-Up',
  13: 'DPad-Down', 
  14: 'DPad-Left',
  15: 'DPad-Right',
  
  // Stadia specific
  16: 'Assistant', // Google Assistant button
  17: 'Capture'    // Capture button
}

// Axis mapping for Stadia (matches your documentation)
const STADIA_AXIS_MAP = {
  0: 'Left-X',     // wrist_roll
  1: 'Left-Y',     // wrist_flex  
  2: 'Right-X',    // shoulder_pan
  3: 'Right-Y',    // shoulder_lift
  4: 'L2-Analog',  // gripper_close (analog trigger)
  5: 'R2-Analog'   // gripper_open (analog trigger)
}

// Robot joint mappings from your documentation
const ROBOT_JOINT_MAP = {
  // Sticks (analog)
  'Left-X': { joint: 'wrist_roll', scale: 1.0 },
  'Left-Y': { joint: 'wrist_flex', scale: -1.0 }, // Inverted
  'Right-X': { joint: 'shoulder_pan', scale: 1.0 },
  'Right-Y': { joint: 'shoulder_lift', scale: -1.0 }, // Inverted
  
  // Triggers (analog)
  'L2-Analog': { joint: 'gripper', scale: -1.0 }, // Close gripper
  'R2-Analog': { joint: 'gripper', scale: 1.0 },  // Open gripper
  
  // Buttons (digital)
  'L1': { joint: 'elbow_flex', value: -1.0 }, // Down
  'R1': { joint: 'elbow_flex', value: 1.0 },  // Up
  
  // Face buttons for alternative control
  'A': { joint: 'wrist_flex', value: -1.0 },  // Down
  'Y': { joint: 'wrist_flex', value: 1.0 },   // Up  
  'X': { joint: 'wrist_roll', value: -1.0 },  // Left
  'B': { joint: 'wrist_roll', value: 1.0 },   // Right
  
  // D-pad
  'DPad-Up': { joint: 'shoulder_lift', value: 1.0 },
  'DPad-Down': { joint: 'shoulder_lift', value: -1.0 },
  'DPad-Left': { joint: 'shoulder_pan', value: -1.0 },
  'DPad-Right': { joint: 'shoulder_pan', value: 1.0 }
}

type GamepadType = 'stadia' | 'ps' | 'xbox' | 'nintendo'

interface GamepadControlProps {
  onJointCommand: (jointCommands: Record<string, number>) => void
  isConnected: boolean
}

interface GamepadState {
  connected: boolean
  id: string
  buttons: boolean[]
  axes: number[]
  timestamp: number
}

export function GamepadControl({ onJointCommand, isConnected }: GamepadControlProps) {
  const [gamepadType, setGamepadType] = useState<GamepadType>('stadia')
  const [gamepadState, setGamepadState] = useState<GamepadState | null>(null)
  const [pressedButtons, setPressedButtons] = useState<Set<number>>(new Set())
  const animationFrameRef = useRef<number>()
  const lastCommandRef = useRef<Record<string, number>>({})
  
  // Deadzone for analog sticks
  const DEADZONE = 0.15
  const TRIGGER_THRESHOLD = 0.05
  
  const applyDeadzone = (value: number): number => {
    if (Math.abs(value) < DEADZONE) return 0
    const sign = value > 0 ? 1 : -1
    return sign * (Math.abs(value) - DEADZONE) / (1.0 - DEADZONE)
  }
  
  const detectGamepadType = (gamepadId: string): GamepadType => {
    const id = gamepadId.toLowerCase()
    if (id.includes('stadia') || id.includes('google')) return 'stadia'
    if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense')) return 'ps'
    if (id.includes('xbox') || id.includes('xinput')) return 'xbox'
    if (id.includes('nintendo') || id.includes('joy-con') || id.includes('pro controller')) return 'nintendo'
    return 'stadia' // Default to Stadia for unknown controllers
  }
  
  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads()
    const gamepad = Array.from(gamepads).find(gp => gp !== null)
    
    if (!gamepad) {
      setGamepadState(null)
      setPressedButtons(new Set())
      return
    }
    
    // Auto-detect gamepad type on first connection
    if (!gamepadState || gamepadState.id !== gamepad.id) {
      const detectedType = detectGamepadType(gamepad.id)
      setGamepadType(detectedType)
    }
    
    const newState: GamepadState = {
      connected: gamepad.connected,
      id: gamepad.id,
      buttons: Array.from(gamepad.buttons).map(b => b.pressed),
      axes: Array.from(gamepad.axes),
      timestamp: gamepad.timestamp
    }
    
    setGamepadState(newState)
    
    // Track pressed buttons for visual feedback
    const pressed = new Set<number>()
    newState.buttons.forEach((isPressed, index) => {
      if (isPressed) pressed.add(index)
    })
    setPressedButtons(pressed)
    
    // Generate robot commands
    if (isConnected) {
      processGamepadInput(newState)
    }
    
    animationFrameRef.current = requestAnimationFrame(pollGamepad)
  }, [gamepadState, isConnected])
  
  const processGamepadInput = (state: GamepadState) => {
    const commands: Record<string, number> = {}
    
    // Process analog axes (sticks and triggers)
    state.axes.forEach((value, index) => {
      const axisName = STADIA_AXIS_MAP[index as keyof typeof STADIA_AXIS_MAP]
      if (!axisName) return
      
      const mapping = ROBOT_JOINT_MAP[axisName as keyof typeof ROBOT_JOINT_MAP]
      if (!mapping || !('scale' in mapping)) return
      
      let processedValue = value
      
      // Apply deadzone for sticks
      if (axisName.includes('Left') || axisName.includes('Right')) {
        processedValue = applyDeadzone(value)
      }
      
      // Apply threshold for triggers
      if (axisName.includes('Analog')) {
        // Convert trigger range [-1, 1] to [0, 1]
        processedValue = (value + 1) / 2
        if (processedValue < TRIGGER_THRESHOLD) processedValue = 0
      }
      
      if (Math.abs(processedValue) > 0) {
        const command = processedValue * mapping.scale
        const joint = mapping.joint
        
        // Handle gripper logic (L2 closes, R2 opens)
        if (joint === 'gripper') {
          commands[joint] = (commands[joint] || 0) + command
        } else {
          commands[joint] = command
        }
      }
    })
    
    // Process digital buttons
    state.buttons.forEach((pressed, index) => {
      if (!pressed) return
      
      const buttonName = STADIA_CONTROLLER_MAP[index as keyof typeof STADIA_CONTROLLER_MAP]
      if (!buttonName) return
      
      const mapping = ROBOT_JOINT_MAP[buttonName as keyof typeof ROBOT_JOINT_MAP]
      if (!mapping || !('value' in mapping)) return
      
      commands[mapping.joint] = mapping.value
    })
    
    // Only send commands if they've changed
    const commandsChanged = Object.keys(commands).some(
      joint => commands[joint] !== (lastCommandRef.current[joint] || 0)
    )
    
    if (commandsChanged || Object.keys(commands).length !== Object.keys(lastCommandRef.current).length) {
      lastCommandRef.current = { ...commands }
      onJointCommand(commands)
    }
  }
  
  useEffect(() => {
    // Start polling when component mounts
    animationFrameRef.current = requestAnimationFrame(pollGamepad)
    
    // Listen for gamepad connect/disconnect events
    const handleGamepadConnected = (event: GamepadEvent) => {
      console.log('Gamepad connected:', event.gamepad.id)
    }
    
    const handleGamepadDisconnected = (event: GamepadEvent) => {
      console.log('Gamepad disconnected:', event.gamepad.id)
      setGamepadState(null)
      setPressedButtons(new Set())
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
  
  const getButtonLabel = (buttonName: string): string => {
    // Return appropriate button labels based on controller type
    const labels = {
      stadia: {
        'A': 'A', 'B': 'B', 'X': 'X', 'Y': 'Y',
        'L1': 'L1', 'R1': 'R1', 'L2': 'L2', 'R2': 'R2',
        'DPad-Up': '↑', 'DPad-Down': '↓', 'DPad-Left': '←', 'DPad-Right': '→'
      },
      ps: {
        'A': '×', 'B': '○', 'X': '□', 'Y': '△',
        'L1': 'L1', 'R1': 'R1', 'L2': 'L2', 'R2': 'R2',
        'DPad-Up': '↑', 'DPad-Down': '↓', 'DPad-Left': '←', 'DPad-Right': '→'
      },
      xbox: {
        'A': 'A', 'B': 'B', 'X': 'X', 'Y': 'Y',
        'L1': 'LB', 'R1': 'RB', 'L2': 'LT', 'R2': 'RT',
        'DPad-Up': '↑', 'DPad-Down': '↓', 'DPad-Left': '←', 'DPad-Right': '→'
      },
      nintendo: {
        'A': 'B', 'B': 'A', 'X': 'Y', 'Y': 'X',
        'L1': 'L', 'R1': 'R', 'L2': 'ZL', 'R2': 'ZR',
        'DPad-Up': '↑', 'DPad-Down': '↓', 'DPad-Left': '←', 'DPad-Right': '→'
      }
    }
    
    return labels[gamepadType][buttonName as keyof typeof labels[typeof gamepadType]] || buttonName
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gamepad Control</h3>
        <Select value={gamepadType} onValueChange={(value: GamepadType) => setGamepadType(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stadia">Stadia</SelectItem>
            <SelectItem value="ps">PlayStation</SelectItem>
            <SelectItem value="xbox">Xbox</SelectItem>
            <SelectItem value="nintendo">Nintendo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {gamepadState ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600">Connected: {gamepadState.id}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Movement</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Shoulder Pan:</span>
                  <span className={`font-mono ${pressedButtons.has(15) ? 'text-blue-400' : pressedButtons.has(14) ? 'text-blue-400' : ''}`}>
                    {getButtonLabel('DPad-Left')} / {getButtonLabel('DPad-Right')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shoulder Lift:</span>
                  <span className={`font-mono ${pressedButtons.has(12) ? 'text-blue-400' : pressedButtons.has(13) ? 'text-blue-400' : ''}`}>
                    {getButtonLabel('DPad-Up')} / {getButtonLabel('DPad-Down')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Elbow:</span>
                  <span className={`font-mono ${pressedButtons.has(5) ? 'text-blue-400' : pressedButtons.has(4) ? 'text-blue-400' : ''}`}>
                    {getButtonLabel('R1')} / {getButtonLabel('L1')}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Wrist & Gripper</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Wrist Roll:</span>
                  <span className={`font-mono ${pressedButtons.has(2) ? 'text-blue-400' : pressedButtons.has(1) ? 'text-blue-400' : ''}`}>
                    {getButtonLabel('X')} / {getButtonLabel('B')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Wrist Flex:</span>
                  <span className={`font-mono ${pressedButtons.has(3) ? 'text-blue-400' : pressedButtons.has(0) ? 'text-blue-400' : ''}`}>
                    {getButtonLabel('Y')} / {getButtonLabel('A')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gripper:</span>
                  <span className={`font-mono ${pressedButtons.has(7) ? 'text-blue-400' : pressedButtons.has(6) ? 'text-blue-400' : ''}`}>
                    {getButtonLabel('R2')} / {getButtonLabel('L2')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-3">
            <div>Left Stick: Wrist Control | Right Stick: Shoulder Control</div>
            <div>Triggers: Analog Gripper Control</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 opacity-50">
            🎮
          </div>
          <p className="text-gray-500 mb-4">No gamepad detected</p>
          <p className="text-sm text-gray-400">
            Connect your Stadia controller via Bluetooth and press any button to activate
          </p>
        </div>
      )}
    </div>
  )
}