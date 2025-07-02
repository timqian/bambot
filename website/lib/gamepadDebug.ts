/**
 * Stadia Controller Debug Utility for SO101 Robot
 * Based on your pro2robot Python documentation
 * 
 * Usage:
 * import { StadiaDebugger } from '@/lib/gamepadDebug'
 * const debugger = new StadiaDebugger()
 * debugger.start()
 */

export interface GamepadState {
  connected: boolean;
  id: string;
  buttons: boolean[];
  axes: number[];
  timestamp: number;
}

export interface RobotJoints {
  // Physical servos (using servoId as key)
  [servoId: number]: number;
  // Special functions
  take_photo: number;
  end_episode: number;
}

export interface GamepadMapping {
  joint?: string;      // For special functions like take_photo, end_episode
  servoId?: number;    // For physical servo control
  scale?: number;      // For analog controls
  value?: number;      // For button controls
  description: string;
}

// SO101 mapping using correct servoId from robotConfig
export const STADIA_SO101_MAPPING: Record<string, GamepadMapping> = {
  // Analog axes (sticks) - Using servoId from robotConfig.ts
  'axis_0': { servoId: 5, scale: 1.0, description: 'Left Stick X → Wrist Roll (Servo 5)' },
  'axis_1': { servoId: 4, scale: -1.0, description: 'Left Stick Y → Wrist Pitch (Servo 4, inverted)' },
  'axis_2': { servoId: 1, scale: 1.0, description: 'Right Stick X → Rotation (Servo 1)' },
  'axis_3': { servoId: 2, scale: -1.0, description: 'Right Stick Y → Pitch (Servo 2, inverted)' },
  
  // Digital buttons (Stadia controller mapping)
  'button_4': { servoId: 3, value: -1.0, description: 'L1 Bumper → Elbow Down (Servo 3)' },
  'button_5': { servoId: 3, value: 1.0, description: 'R1 Bumper → Elbow Up (Servo 3)' },
  
  // Face buttons (A/B for gripper, X/Y for special functions)
  'button_0': { servoId: 6, value: -1.0, description: 'A Button → Close Gripper (Servo 6)' },
  'button_1': { servoId: 6, value: 1.0, description: 'B Button → Open Gripper (Servo 6)' },
  'button_2': { joint: 'take_photo', value: 1.0, description: 'X Button → Take Photo' },
  'button_3': { joint: 'end_episode', value: 1.0, description: 'Y Button → End Episode Recording' },
  
  // D-pad (alternative controls)
  'button_12': { servoId: 2, value: 1.0, description: 'D-Pad Up → Pitch Up (Servo 2)' },
  'button_13': { servoId: 2, value: -1.0, description: 'D-Pad Down → Pitch Down (Servo 2)' },
  'button_14': { servoId: 1, value: -1.0, description: 'D-Pad Left → Rotation Left (Servo 1)' },
  'button_15': { servoId: 1, value: 1.0, description: 'D-Pad Right → Rotation Right (Servo 1)' }
};

export class StadiaDebugger {
  private deadzone: number;
  private triggerThreshold: number;
  private isRunning: boolean = false;
  private animationFrame: number | null = null;
  private lastState: GamepadState | null = null;
  private lastJoints: RobotJoints | null = null;
  
  constructor(deadzone: number = 0.15, triggerThreshold: number = 0.05) {
    this.deadzone = deadzone;
    this.triggerThreshold = triggerThreshold;
  }
  
  /**
   * Check if Gamepad API is available
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'getGamepads' in navigator;
  }
  
  /**
   * Detect connected gamepad
   */
  public detectGamepad(): Gamepad | null {
    if (!this.isSupported()) {
      console.error('Gamepad API not supported');
      return null;
    }
    
    const gamepads = navigator.getGamepads();
    return Array.from(gamepads).find(gp => gp !== null) || null;
  }
  
  /**
   * Check if gamepad is Stadia controller
   */
  public isStadiaController(gamepad: Gamepad): boolean {
    const id = gamepad.id.toLowerCase();
    return id.includes('stadia') || id.includes('google');
  }
  
  /**
   * Apply deadzone to analog input
   */
  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) return 0;
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.abs(value) - this.deadzone) / (1.0 - this.deadzone);
  }
  
  /**
   * Convert gamepad input to robot joint commands
   * Returns incremental changes for physical servos
   */
  public mapToRobotJoints(gamepad: Gamepad): RobotJoints {
    const joints: RobotJoints = {
      take_photo: 0,
      end_episode: 0
    };
    
    // Process analog axes (sticks) - return velocity for incremental movement
    gamepad.axes.forEach((value, index) => {
      const key = `axis_${index}`;
      const mapping = STADIA_SO101_MAPPING[key];
      if (!mapping || !mapping.servoId || mapping.scale === undefined) return;
      
      let processedValue = value;
      
      // Apply deadzone for sticks (axes 0-3)
      if (index < 4) {
        processedValue = this.applyDeadzone(value);
      }
      
      if (Math.abs(processedValue) > 0) {
        const velocity = processedValue * mapping.scale;
        joints[mapping.servoId] = velocity;
      }
    });
    
    // Process digital buttons
    gamepad.buttons.forEach((button, index) => {
      if (!button.pressed) return;
      
      const key = `button_${index}`;
      const mapping = STADIA_SO101_MAPPING[key];
      if (!mapping || !('value' in mapping) || mapping.value === undefined) return;
      
      if (mapping.servoId) {
        // Physical servo button command
        joints[mapping.servoId] = mapping.value;
      } else if (mapping.joint) {
        // Special function
        const joint = mapping.joint as keyof RobotJoints;
        joints[joint] = mapping.value;
      }
    });
    
    return joints;
  }
  
  /**
   * Get current gamepad state
   */
  public getGamepadState(): GamepadState | null {
    const gamepad = this.detectGamepad();
    if (!gamepad) return null;
    
    return {
      connected: gamepad.connected,
      id: gamepad.id,
      buttons: Array.from(gamepad.buttons).map(b => b.pressed),
      axes: Array.from(gamepad.axes),
      timestamp: gamepad.timestamp
    };
  }
  
  /**
   * Log gamepad information
   */
  public logGamepadInfo(gamepad: Gamepad): void {
    const isStadia = this.isStadiaController(gamepad);
    
    console.group('🎮 Gamepad Information');
    console.log(`Name: ${gamepad.id}`);
    console.log(`Type: ${isStadia ? 'Stadia Controller ✅' : 'Other Controller ⚠️'}`);
    console.log(`Connected: ${gamepad.connected}`);
    console.log(`Buttons: ${gamepad.buttons.length}`);
    console.log(`Axes: ${gamepad.axes.length}`);
    console.log(`Mapping: ${gamepad.mapping}`);
    console.log(`Timestamp: ${gamepad.timestamp}`);
    
    if (!isStadia) {
      console.warn('Non-Stadia controller detected. Button mapping may not match SO101 documentation.');
    }
    
    console.groupEnd();
  }
  
  /**
   * Log current button and axis states
   */
  public logCurrentState(gamepad: Gamepad): void {
    const joints = this.mapToRobotJoints(gamepad);
    
    // Log active axes
    const activeAxes: string[] = [];
    gamepad.axes.forEach((value, index) => {
      const processed = index < 4 ? this.applyDeadzone(value) : (value + 1) / 2;
      if (Math.abs(processed) > 0.01) {
        const mapping = STADIA_SO101_MAPPING[`axis_${index}`];
        activeAxes.push(`Axis ${index} (${mapping?.description || 'Unknown'}): ${value.toFixed(3)}`);
      }
    });
    
    // Log pressed buttons with detailed mapping info
    const pressedButtons: string[] = [];
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed) {
        const mapping = STADIA_SO101_MAPPING[`button_${index}`];
        const mappingInfo = mapping ? mapping.description : 'UNMAPPED - Check button index!';
        pressedButtons.push(`Button ${index} (${mappingInfo})`);
        
        // Extra logging for L1/R1/L2/R2 debugging
        if (index >= 4 && index <= 7) {
          console.warn(`🎮 Shoulder/Trigger button detected: Button ${index} - ${mappingInfo}`);
        }
      }
    });
    
    // Log robot joint commands
    const activeJoints = Object.entries(joints)
      .filter(([_, value]) => Math.abs(value) > 0.01)
      .map(([joint, value]) => `${joint}: ${value.toFixed(3)}`);
    
    if (activeAxes.length > 0 || pressedButtons.length > 0 || activeJoints.length > 0) {
      console.group('📊 Current Input State');
      if (activeAxes.length > 0) {
        console.log('Active Axes:', activeAxes);
      }
      if (pressedButtons.length > 0) {
        console.log('Pressed Buttons:', pressedButtons);
      }
      if (activeJoints.length > 0) {
        console.log('🤖 Robot Commands:', activeJoints);
      }
      console.groupEnd();
    }
  }
  
  /**
   * Test all mappings by prompting user
   */
  public async testAllMappings(): Promise<void> {
    console.log('🧪 Starting Stadia Controller Mapping Test');
    console.log('Follow the prompts to test each control...\n');
    
    const testSequence = [
      { action: 'Move LEFT STICK horizontally', expected: 'wrist_roll changes' },
      { action: 'Move LEFT STICK vertically', expected: 'wrist_flex changes' },
      { action: 'Move RIGHT STICK horizontally', expected: 'shoulder_pan changes' },
      { action: 'Move RIGHT STICK vertically', expected: 'shoulder_lift changes' },
      { action: 'Press L2 TRIGGER gradually', expected: 'gripper goes negative (close)' },
      { action: 'Press R2 TRIGGER gradually', expected: 'gripper goes positive (open)' },
      { action: 'Press L1 BUMPER', expected: 'elbow_flex goes to -1.0' },
      { action: 'Press R1 BUMPER', expected: 'elbow_flex goes to +1.0' },
      { action: 'Press A BUTTON', expected: 'wrist_flex goes to -1.0' },
      { action: 'Press Y BUTTON', expected: 'wrist_flex goes to +1.0' },
      { action: 'Press X BUTTON', expected: 'wrist_roll goes to -1.0' },
      { action: 'Press B BUTTON', expected: 'wrist_roll goes to +1.0' },
      { action: 'Press D-PAD UP', expected: 'shoulder_lift goes to +1.0' },
      { action: 'Press D-PAD DOWN', expected: 'shoulder_lift goes to -1.0' },
      { action: 'Press D-PAD LEFT', expected: 'shoulder_pan goes to -1.0' },
      { action: 'Press D-PAD RIGHT', expected: 'shoulder_pan goes to +1.0' }
    ];
    
    for (const test of testSequence) {
      console.log(`\n📋 Test: ${test.action}`);
      console.log(`Expected: ${test.expected}`);
      console.log('Press Enter when ready, then perform the action...');
      
      // Wait for user input (in browser, you'd use a prompt or button)
      await new Promise(resolve => {
        const listener = (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            document.removeEventListener('keydown', listener);
            resolve(void 0);
          }
        };
        document.addEventListener('keydown', listener);
      });
      
      // Monitor for 3 seconds
      const startTime = Date.now();
      while (Date.now() - startTime < 3000) {
        const gamepad = this.detectGamepad();
        if (gamepad) {
          this.logCurrentState(gamepad);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n✅ Mapping test complete! Check the logs above for any issues.');
  }
  
  /**
   * Start continuous debugging
   */
  public start(onUpdate?: (joints: RobotJoints, state: GamepadState) => void): void {
    if (this.isRunning) {
      console.warn('Debugger already running');
      return;
    }
    
    if (!this.isSupported()) {
      console.error('Gamepad API not supported');
      return;
    }
    
    this.isRunning = true;
    console.log('🎮 Starting Stadia Controller debug session...');
    console.log('Press any button on your controller to activate it!');
    
    const debugLoop = () => {
      if (!this.isRunning) return;
      
      const gamepad = this.detectGamepad();
      if (gamepad) {
        const state = this.getGamepadState()!;
        const joints = this.mapToRobotJoints(gamepad);
        
        // Log changes
        if (!this.lastJoints || this.hasSignificantChange(joints, this.lastJoints)) {
          this.logCurrentState(gamepad);
          this.lastJoints = joints;
        }
        
        // Call update callback
        if (onUpdate) {
          onUpdate(joints, state);
        }
        
        this.lastState = state;
      }
      
      this.animationFrame = requestAnimationFrame(debugLoop);
    };
    
    debugLoop();
  }
  
  /**
   * Stop debugging
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    console.log('🛑 Stadia Controller debug session stopped');
  }
  
  /**
   * Check if joints have changed significantly
   */
  private hasSignificantChange(current: RobotJoints, last: RobotJoints): boolean {
    const threshold = 0.05;
    return Object.keys(current).some(key => {
      const joint = key as keyof RobotJoints;
      return Math.abs(current[joint] - last[joint]) > threshold;
    });
  }
  
  /**
   * Print mapping reference
   */
  public printMappingReference(): void {
    console.group('🗺️ SO101 Robot Mapping Reference');
    console.log('Based on your pro2robot documentation:\n');
    
    Object.entries(STADIA_SO101_MAPPING).forEach(([key, mapping]) => {
      const type = key.startsWith('axis') ? '📊 Analog' : '🔲 Digital';
      const scale = 'scale' in mapping ? ` (scale: ${mapping.scale})` : '';
      const value = 'value' in mapping ? ` (value: ${mapping.value})` : '';
      console.log(`${type} ${key}: ${mapping.description}${scale}${value}`);
    });
    
    console.log('\n🎯 Control Summary:');
    console.log('• Left Stick: Wrist control (roll + flex)');
    console.log('• Right Stick: Shoulder control (pan + lift)');
    console.log('• L1/R1: Elbow control (down/up)');
    console.log('• L2/R2: Gripper control (close/open)');
    console.log('• Face Buttons: Alternative wrist control');
    console.log('• D-Pad: Alternative shoulder control');
    
    console.groupEnd();
  }
}

// Export convenience functions
export function createStadiaDebugger(deadzone?: number, triggerThreshold?: number): StadiaDebugger {
  return new StadiaDebugger(deadzone, triggerThreshold);
}

export function quickTest(): void {
  const gamepadDebugger = new StadiaDebugger();
  
  console.log('🚀 Quick Stadia Controller Test');
  gamepadDebugger.printMappingReference();
  
  const gamepad = gamepadDebugger.detectGamepad();
  if (gamepad) {
    gamepadDebugger.logGamepadInfo(gamepad);
    console.log('✅ Controller detected! Use gamepadDebugger.start() to begin live testing.');
  } else {
    console.log('❌ No controller detected. Connect your Stadia controller and press any button.');
  }
}