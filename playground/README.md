# Bambot Player

A browser-based application for running simulations and controlling Bambot and SO100 arm. This interactive platform allows users to visualize and manipulate robotic models in real-time.

## Features

- Virtual robot arm visualization and control
- Real robot control via Web Serial API
- Keyboard control for both virtual and real robots simultaneously
- Support for multiple robot models

## Real Robot Control

The application now supports controlling real robot arms with Feetech SCS servo motors (ID 1-6) using the Web Serial API. When connected to a real robot:

1. Keyboard controls will simultaneously move both the virtual and real robot
2. Robot movement speed can be adjusted using the speed slider
3. The real robot connection can be toggled using the "Connect Real Robot" button in the control panel

### How it Works

The system uses a relative movement approach:
1. When connecting, it reads the current positions of all servos 
2. Keyboard commands apply relative position changes rather than absolute positions
3. This ensures the real robot responds properly regardless of its initial position

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
4. Use keyboard controls (Q/A, W/S, etc.) to move both virtual and real robots
