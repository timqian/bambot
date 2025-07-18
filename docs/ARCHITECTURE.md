# Bambot Architecture Documentation

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Details](#component-details)
- [Data Flow](#data-flow)
- [Architecture Patterns](#architecture-patterns)
- [Technology Stack](#technology-stack)
- [Development Guidelines](#development-guidelines)

## Overview

Bambot is a web-based platform for controlling various types of robots through a browser interface. The architecture is designed to be modular, extensible, and easy to use, supporting multiple robot configurations and control paradigms.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │   Landing   │  │  Play Page   │  │  Control Panels     │    │
│  │    Page     │  │  (/play/*)   │  │  - Keyboard         │    │
│  │             │  │              │  │  - Leader/Follower  │    │
│  │             │  │              │  │  - AI Chat          │    │
│  └─────────────┘  └──────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │   Next.js   │  │    React     │  │   State Hooks      │    │
│  │  App Router │  │  Components  │  │  - useRobotControl │    │
│  │             │  │              │  │  - useLeaderRobot  │    │
│  └─────────────┘  └──────────────┘  └─────────────────────┘    │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │  Three.js   │  │ URDF Loader  │  │  Robot Configs     │    │
│  │   Scene     │  │              │  │  (robotConfigMap)  │    │
│  └─────────────┘  └──────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hardware Abstraction Layer                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    feetech.js SDK                         │   │
│  │  ┌────────────┐  ┌──────────────┐  ┌────────────────┐   │   │
│  │  │ scsServoSDK│  │ lowLevelSDK  │  │   Constants    │   │   │
│  │  │            │  │              │  │                │   │   │
│  │  └────────────┘  └──────────────┘  └────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Hardware Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ Web Serial   │  │    USB/TTL   │  │  Feetech STS3215   │    │
│  │     API      │  │   Adapter    │  │    Servo Motors    │    │
│  └──────────────┘  └──────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. **Frontend Components** (`website/`)

#### Core Pages

- **Landing Page** (`app/page.tsx`): Displays available robots with play/assemble options
- **Play Page** (`app/play/[slug]/page.tsx`): Main robot control interface

#### Key Components

- **RobotScene** (`components/RobotScene.tsx`): 3D visualization using Three.js
- **ControlPanel** (`components/ControlPanel.tsx`): UI for selecting control modes
- **KeyboardControl**: Maps keyboard inputs to robot movements
- **LeaderControl**: Implements teleoperation between two robots
- **AIControl**: Natural language robot control using OpenAI

### 2. **Hardware SDK** (`feetech.js/`)

#### Core Modules

- **scsServoSDK.mjs**: High-level API for servo control
  - `connect()`: Establishes serial connection
  - `writePos()`: Sets servo position
  - `readPos()`: Reads current position
  - `enableTorque()`: Enables/disables motor torque

- **lowLevelSDK.mjs**: Packet handling and communication
  - Implements Feetech communication protocol
  - Handles packet construction and parsing
  - Manages serial port I/O

### 3. **Robot Configurations**

Each robot is defined in `robotConfigMap` with:

```typescript
interface RobotConfig {
  urdfPath: string;           // Path to URDF model
  cameraPosition: number[];   // Default camera view
  jointMapping: Record<string, number>; // Joint name to servo ID
  keyMapping?: Record<string, string>;  // Keyboard controls
  systemPrompt?: string;      // AI control instructions
}
```

## Data Flow

### Control Flow Sequence

```
1. User Input (Keyboard/Leader/AI)
         │
         ▼
2. Control Panel Component
         │
         ▼
3. useRobotControl Hook
         │
         ├─────────────────────┐
         ▼                     ▼
4. Update Local State    Send to Hardware
         │                     │
         ▼                     ▼
5. Update 3D Scene      feetech.js SDK
                              │
                              ▼
                        Serial Command
                              │
                              ▼
                        Physical Robot
```

### State Synchronization

- Joint states are maintained in the `useRobotControl` hook
- Updates trigger both 3D visualization and hardware commands
- Recording system captures states at regular intervals (50ms default)

## Architecture Patterns

### 1. **Configuration-Driven Design**

- All robot-specific details centralized in configuration objects
- Easy to add new robots without modifying core logic
- Supports different robot types (arms, wheeled, quadruped, humanoid)

### 2. **Hook-Based State Management**

```typescript
// Custom hooks encapsulate complex logic
const useRobotControl = (robotConfig, sdk) => {
  // Manages joint states, recording, playback
  // Handles hardware communication
  // Provides unified API for different control modes
};
```

### 3. **Real-Time Control Architecture**

- Direct serial communication for low latency (~10ms round trip)
- Optimistic UI updates for responsive feel
- Graceful degradation when hardware not connected

### 4. **Modular Control Interfaces**

- Each control mode is a separate component
- Shared state through context/props
- Easy to add new control paradigms

## Technology Stack

### Frontend

- **Framework**: Next.js 15.3.2 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js + React Three Fiber
- **Components**: Radix UI

### Hardware Communication

- **Protocol**: Web Serial API
- **Format**: Custom binary protocol (Feetech)
- **Baud Rate**: 1,000,000 (configurable)

### AI Integration

- **SDK**: Vercel AI SDK
- **Model**: OpenAI GPT-4
- **Interface**: Streaming chat responses

## Development Guidelines

### Adding a New Robot

1. Create URDF model in `public/urdfs/`
2. Add configuration to `robotConfigMap`:

```typescript
export const robotConfigMap = {
  "your-robot": {
    urdfPath: "/urdfs/your-robot.urdf",
    cameraPosition: [x, y, z],
    jointMapping: {
      "joint_name": servoId,
      // ...
    },
    // Optional configurations
    keyMapping: { /* ... */ },
    systemPrompt: "AI control instructions..."
  }
};
```

3. Add robot metadata to `robots` array in landing page

### Creating New Control Modes

1. Create component in `components/controls/`
2. Implement control logic using `useRobotControl` hook
3. Add to `ControlPanel` component
4. Update control type union

### Hardware Communication Best Practices

- Always check connection status before sending commands
- Implement retry logic for failed commands
- Use try-catch blocks for serial operations
- Provide feedback when hardware is disconnected

### Performance Considerations

- Minimize state updates during real-time control
- Use React.memo for expensive 3D components
- Batch servo commands when possible
- Implement debouncing for rapid user inputs

## Security Considerations

- Serial API requires user permission
- No remote code execution
- AI prompts are sanitized
- Local storage for user preferences only

## Future Architecture Considerations

1. **WebRTC Support**: For remote robot control
2. **Plugin System**: For custom control modes
3. **Multi-Robot Coordination**: Swarm control capabilities
4. **Simulation Mode**: Physics-based robot simulation
5. **Mobile Support**: Touch controls and responsive UI

---

For more information, see the main [README.md](../README.md) or visit [bambot.org](https://bambot.org).
