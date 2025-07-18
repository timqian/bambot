import { renderHook, act } from '@testing-library/react'
import { useGamepadControl, STADIA_MAPPING } from '../useGamepadControl'

// Mock gamepad
const createMockGamepad = (overrides = {}) => ({
  id: 'Google Inc. Stadia Controller rev. A (STANDARD GAMEPAD Vendor: 18d1 Product: 9400)',
  connected: true,
  buttons: Array(18).fill(null).map(() => ({ pressed: false, touched: false, value: 0 })),
  axes: [0, 0, 0, 0, -1, -1],
  timestamp: Date.now(),
  mapping: 'standard',
  hapticActuators: [],
  vibrationActuator: null,
  ...overrides
})

// Mock navigator.getGamepads
Object.defineProperty(global.navigator, 'getGamepads', {
  writable: true,
  value: jest.fn(() => [])
})

// Mock requestAnimationFrame
let animationFrameCallback: (() => void) | null = null
global.requestAnimationFrame = jest.fn((cb) => {
  animationFrameCallback = cb
  return 1
})

global.cancelAnimationFrame = jest.fn()

describe('useGamepadControl', () => {
  const mockOnJointCommand = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnJointCommand.mockClear()
    animationFrameCallback = null
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([])
  })
  
  it('initializes with no gamepad connected', () => {
    const { result } = renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    expect(result.current.isConnected).toBe(false)
    expect(result.current.gamepadId).toBe(null)
  })
  
  it('detects gamepad connection', () => {
    const mockGamepad = createMockGamepad()
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    const { result } = renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    // Trigger animation frame
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(result.current.isConnected).toBe(true)
    expect(result.current.gamepadId).toBe(mockGamepad.id)
  })
  
  it('processes stick input correctly', () => {
    const mockGamepad = createMockGamepad({
      axes: [0.5, -0.3, 0.7, -0.8, -1, -1], // Left and right stick movement
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        wrist_roll: expect.any(Number),     // axis 0
        wrist_flex: expect.any(Number),     // axis 1 (inverted)
        shoulder_pan: expect.any(Number),   // axis 2
        shoulder_lift: expect.any(Number),  // axis 3 (inverted)
      })
    )
  })
  
  it('applies deadzone correctly', () => {
    const mockGamepad = createMockGamepad({
      axes: [0.1, 0.05, 0, 0, -1, -1], // Small movements within deadzone
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ 
        onJointCommand: mockOnJointCommand,
        deadzone: 0.15 
      })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    // Should not send commands for inputs within deadzone
    expect(mockOnJointCommand).not.toHaveBeenCalled()
  })
  
  it('processes trigger input correctly', () => {
    const mockGamepad = createMockGamepad({
      axes: [0, 0, 0, 0, 0.5, -0.3], // L2 and R2 triggers
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        gripper: expect.any(Number)
      })
    )
  })
  
  it('processes button input correctly', () => {
    const buttons = Array(18).fill(null).map(() => ({ pressed: false, touched: false, value: 0 }))
    buttons[9] = { pressed: true, touched: true, value: 1 } // L1 button
    
    const mockGamepad = createMockGamepad({
      buttons,
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        elbow_flex: -1.0 // L1 maps to elbow down
      })
    )
  })
  
  it('handles gamepad disconnection', () => {
    const mockGamepad = createMockGamepad()
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    const { result } = renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    // Connect first
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(result.current.isConnected).toBe(true)
    
    // Disconnect
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([])
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(result.current.isConnected).toBe(false)
    expect(result.current.gamepadId).toBe(null)
    expect(mockOnJointCommand).toHaveBeenCalledWith({}) // Empty commands to stop robot
  })
  
  it('respects enabled flag', () => {
    const mockGamepad = createMockGamepad({
      axes: [0.5, 0.5, 0.5, 0.5, 0, 0],
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ 
        onJointCommand: mockOnJointCommand,
        enabled: false 
      })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    // Should not process input when disabled
    expect(mockOnJointCommand).not.toHaveBeenCalled()
  })
  
  it('uses custom deadzone', () => {
    const mockGamepad = createMockGamepad({
      axes: [0.2, 0, 0, 0, -1, -1], // Movement that would be outside smaller deadzone
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ 
        onJointCommand: mockOnJointCommand,
        deadzone: 0.1 // Smaller deadzone
      })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        wrist_roll: expect.any(Number)
      })
    )
  })
  
  it('uses custom trigger threshold', () => {
    const mockGamepad = createMockGamepad({
      axes: [0, 0, 0, 0, 0.02, -1], // Very small trigger input
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ 
        onJointCommand: mockOnJointCommand,
        triggerThreshold: 0.01 // Very sensitive threshold
      })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        gripper: expect.any(Number)
      })
    )
  })
  
  it('uses custom mapping', () => {
    const customMapping = {
      'axis_0': { joint: 'custom_joint', scale: 2.0 }
    }
    
    const mockGamepad = createMockGamepad({
      axes: [0.5, 0, 0, 0, -1, -1],
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ 
        onJointCommand: mockOnJointCommand,
        mapping: customMapping
      })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_joint: expect.any(Number)
      })
    )
  })
  
  it('clamps gripper values', () => {
    const mockGamepad = createMockGamepad({
      axes: [0, 0, 0, 0, 1, 1], // Both triggers fully pressed (would exceed clamp)
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    const calls = mockOnJointCommand.mock.calls
    const lastCall = calls[calls.length - 1][0]
    
    // Gripper value should be clamped between -1 and 1
    expect(lastCall.gripper).toBeGreaterThanOrEqual(-1)
    expect(lastCall.gripper).toBeLessThanOrEqual(1)
  })
  
  it('only sends commands when they change', () => {
    const mockGamepad = createMockGamepad({
      axes: [0.5, 0, 0, 0, -1, -1],
      timestamp: 1000
    })
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([mockGamepad])
    
    renderHook(() => 
      useGamepadControl({ onJointCommand: mockOnJointCommand })
    )
    
    // First call
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledTimes(1)
    
    // Same input - should not call again
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledTimes(1)
    
    // Different input - should call again
    mockGamepad.axes[0] = 0.7
    mockGamepad.timestamp = 2000
    
    act(() => {
      if (animationFrameCallback) animationFrameCallback()
    })
    
    expect(mockOnJointCommand).toHaveBeenCalledTimes(2)
  })
})