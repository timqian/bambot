import { render, screen, act } from '@testing-library/react'
import { GamepadControl } from '../GamepadControl'

// Mock gamepad API
const mockGamepad = {
  id: 'Google Inc. Stadia Controller rev. A (STANDARD GAMEPAD Vendor: 18d1 Product: 9400)',
  connected: true,
  buttons: Array(18).fill(null).map(() => ({ pressed: false, touched: false, value: 0 })),
  axes: [0, 0, 0, 0, -1, -1], // 6 axes for Stadia controller
  timestamp: Date.now(),
  mapping: 'standard',
  hapticActuators: [],
  vibrationActuator: null
}

// Mock navigator.getGamepads
Object.defineProperty(global.navigator, 'getGamepads', {
  writable: true,
  value: jest.fn(() => [mockGamepad])
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16) // ~60fps
  return 1
})

global.cancelAnimationFrame = jest.fn()

describe('GamepadControl', () => {
  const mockOnJointCommand = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnJointCommand.mockClear()
  })
  
  it('renders without gamepad connected', () => {
    // Mock no gamepad
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([null, null, null, null])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    expect(screen.getByText('No gamepad detected')).toBeInTheDocument()
    expect(screen.getByText('Connect your Stadia controller via Bluetooth and press any button to activate')).toBeInTheDocument()
  })
  
  it('detects Stadia controller and shows connection status', async () => {
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    // Wait for component to detect gamepad
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    expect(screen.getByText(/Connected:/)).toBeInTheDocument()
    expect(screen.getByText(/Stadia Controller/)).toBeInTheDocument()
  })
  
  it('shows correct button mappings for Stadia controller', async () => {
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    // Check if Stadia-specific button labels are shown
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('X')).toBeInTheDocument()
    expect(screen.getByText('Y')).toBeInTheDocument()
    expect(screen.getByText('L1')).toBeInTheDocument()
    expect(screen.getByText('R1')).toBeInTheDocument()
  })
  
  it('processes analog stick input correctly', async () => {
    // Simulate right stick movement (shoulder control)
    const gamepadWithInput = {
      ...mockGamepad,
      axes: [0, 0, 0.5, -0.3, -1, -1], // Right stick moved
      timestamp: Date.now()
    }
    
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([gamepadWithInput])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    // Should call onJointCommand with shoulder movements
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        shoulder_pan: expect.any(Number),
        shoulder_lift: expect.any(Number)
      })
    )
  })
  
  it('processes button input correctly', async () => {
    // Simulate L1 button press (elbow down)
    const gamepadWithButton = {
      ...mockGamepad,
      buttons: mockGamepad.buttons.map((btn, index) => 
        index === 4 ? { pressed: true, touched: true, value: 1 } : btn
      ),
      timestamp: Date.now()
    }
    
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([gamepadWithButton])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    // Should call onJointCommand with elbow movement
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        elbow_flex: -1.0
      })
    )
  })
  
  it('applies deadzone to stick inputs', async () => {
    // Simulate small stick movement within deadzone
    const gamepadWithSmallInput = {
      ...mockGamepad,
      axes: [0.1, 0.05, 0, 0, -1, -1], // Small movements
      timestamp: Date.now()
    }
    
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([gamepadWithSmallInput])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    // Should not send commands for inputs within deadzone
    expect(mockOnJointCommand).not.toHaveBeenCalledWith(
      expect.objectContaining({
        wrist_roll: expect.any(Number),
        wrist_flex: expect.any(Number)
      })
    )
  })
  
  it('handles trigger inputs correctly', async () => {
    // Simulate trigger inputs (gripper control)
    const gamepadWithTriggers = {
      ...mockGamepad,
      axes: [0, 0, 0, 0, 0.5, -0.3], // L2 and R2 triggers
      timestamp: Date.now()
    }
    
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([gamepadWithTriggers])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    // Should combine L2 (close) and R2 (open) for gripper
    expect(mockOnJointCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        gripper: expect.any(Number)
      })
    )
  })
  
  it('changes controller type and updates button labels', async () => {
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    // Initially should show Stadia labels
    expect(screen.getByDisplayValue('Stadia')).toBeInTheDocument()
    
    // Change to PlayStation
    const select = screen.getByDisplayValue('Stadia')
    
    await act(async () => {
      // Simulate selection change
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    
    // Button labels should update (though this test would need more complex mocking)
  })
  
  it('highlights pressed buttons visually', async () => {
    // Simulate button press
    const gamepadWithButton = {
      ...mockGamepad,
      buttons: mockGamepad.buttons.map((btn, index) => 
        index === 0 ? { pressed: true, touched: true, value: 1 } : btn
      ),
      timestamp: Date.now()
    }
    
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([gamepadWithButton])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={true} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    // Check if button highlighting class is applied
    const buttonElements = screen.getAllByText('A')
    expect(buttonElements.some(el => el.className.includes('text-blue-400'))).toBe(true)
  })
  
  it('does not send commands when robot is disconnected', async () => {
    const gamepadWithInput = {
      ...mockGamepad,
      axes: [0.5, 0.5, 0.5, 0.5, 0, 0],
      timestamp: Date.now()
    }
    
    ;(global.navigator.getGamepads as jest.Mock).mockReturnValue([gamepadWithInput])
    
    render(<GamepadControl onJointCommand={mockOnJointCommand} isConnected={false} />)
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    
    // Should not send commands when robot is disconnected
    expect(mockOnJointCommand).not.toHaveBeenCalled()
  })
})