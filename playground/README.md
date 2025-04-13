# Playground

A browser-based application for running simulations and controlling Bambot and SO100 arm. This interactive platform allows users to visualize and manipulate robotic models in real-time.

## Features

- Virtual robot arm visualization and control
- Real robot control via Web Serial API
- Keyboard and gamepad control for both virtual and real robots simultaneously
- Support for multiple robot models
- Customizable gamepad button mappings

## Controls

### Keyboard Controls
- Use arrow keys and WASD for controlling the robot arm
- Press 'R' to reset the arm position
- Press 'Space' to toggle between simulation and real robot mode

### Gamepad Controls
The application supports gamepad input using the Gamepad API. Connect any compatible gamepad to control the robot arm:

#### Default Button Mappings
- **Rotation**: Face Right (button 1) / Face Left (button 2)
- **Pitch**: Face Top (button 3) / Face Bottom (button 0)
- **Elbow**: R1 (button 5) / L1 (button 4)
- **Wrist Pitch**: D-Up (button 12) / D-Down (button 13)
- **Wrist Roll**: D-Right (button 15) / D-Left (button 14)
- **Jaw**: R2 (button 7) / L2 (button 6)

#### Gamepad Features
- Real-time button highlighting when pressed
- Support for multiple gamepad types (Xbox, PlayStation, Nintendo)
- Automatic gamepad detection and connection
- Visual feedback for button presses and joint limits
- Dynamic button labels based on selected gamepad type

## Real Robot Control

The application now supports controlling real robot arms with Feetech SCS servo motors (ID 1-6) using the Web Serial API. When connected to a real robot:

1. Keyboard and gamepad controls will simultaneously move both the virtual and real robot
2. Robot movement speed can be adjusted using the speed slider
3. The real robot connection can be toggled using the "Connect Real Robot" button in the control panel
4. Each servo's direction can be inverted using the direction toggle buttons next to their status indicators

### How it Works

The system uses a relative movement approach:
1. When connecting, it reads the current positions of all servos 
2. Keyboard and gamepad commands apply relative position changes rather than absolute positions
3. This ensures the real robot responds properly regardless of its initial position
4. Direction toggles allow you to invert individual servo movements if they're rotating in the wrong direction

### Connection Requirements

- Chrome or Edge browser that supports Web Serial API
- USB-to-Serial adapter connected to the robot's servo bus
- Servo IDs configured from 1 to 6 (matching the joint numbers)
- Fixed baudrate: 1,000,000 bps
- Fixed protocol: SCS (1)

### Usage

1. Open the application in a supported browser
2. Click "Connect Real Robot" in the control panel
3. Select the appropriate serial port when prompted
4. Use keyboard controls (Q/A, W/S, etc.) or connect a gamepad to move both virtual and real robots
