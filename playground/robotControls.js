import { MathUtils } from 'three';
// Import SDK and constants for servo control
import { 
  PortHandler, 
  PacketHandler
} from './feetech/scsservo_sdk.mjs';
import {
  COMM_SUCCESS,
  ADDR_SCS_TORQUE_ENABLE,
  ADDR_SCS_GOAL_ACC,
  ADDR_SCS_GOAL_POSITION,
  ADDR_SCS_GOAL_SPEED,
  ADDR_SCS_PRESENT_POSITION,
  ERRBIT_VOLTAGE,
  ERRBIT_ANGLE,
  ERRBIT_OVERHEAT,
  ERRBIT_OVERELE,
  ERRBIT_OVERLOAD
} from './feetech/scsservo_constants.mjs';

// Control state variables
let portHandler = null;
let packetHandler = null;
let isConnectedToRealRobot = false;
let isRobotConnected = false;

// Current servo positions (0-4095)
let servoCurrentPositions = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0
};

// Last known safe positions for error recovery
let servoLastSafePositions = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0
};

// Servo communication status tracking
let servoCommStatus = {
  1: { status: 'idle', lastError: null },
  2: { status: 'idle', lastError: null },
  3: { status: 'idle', lastError: null },
  4: { status: 'idle', lastError: null },
  5: { status: 'idle', lastError: null },
  6: { status: 'idle', lastError: null },
};

// Command queue for sequential servo operations
let commandQueue = [];
let isProcessingQueue = false;

let currentGamepadType = 'ps'; // Default to PlayStation layout

// Servo direction mapping (true = reversed, false = normal)
const servoDirectionMapping = {
  1: true,   // base rotation servo
  2: false,  // shoulder servo
  3: false,  // elbow servo
  4: false,  // wrist pitch servo
  5: false,  // wrist roll servo
  6: false   // gripper servo
};

// Load saved direction mappings from localStorage
function loadDirectionMappings() {
  const savedMappings = localStorage.getItem('servoDirectionMappings');
  if (savedMappings) {
    const parsed = JSON.parse(savedMappings);
    Object.keys(parsed).forEach(id => {
      servoDirectionMapping[id] = parsed[id];
    });
  }
}

// Save direction mappings to localStorage
function saveDirectionMappings() {
  localStorage.setItem('servoDirectionMappings', JSON.stringify(servoDirectionMapping));
}

// Initialize direction mappings
loadDirectionMappings();

/**
 * Display alert message for joint limits or servo errors
 * @param {string} type - Alert type ('joint' or 'servo')
 * @param {string} message - Alert message
 * @param {number} [duration=3000] - Display duration in ms
 */
function showAlert(type, message, duration = 3000) {
  // Remove any existing alerts
  const existingAlert = document.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // Create new alert
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  // Add to document
  document.body.appendChild(alert);
  
  // Remove after duration
  setTimeout(() => {
    alert.remove();
  }, duration);
}

/**
 * Add command to queue and process
 * @param {Function} commandFn - Promise-returning function
 * @returns {Promise} Command execution promise
 */
function queueCommand(commandFn) {
  return new Promise((resolve, reject) => {
    // Add command to queue
    commandQueue.push({
      execute: commandFn,
      resolve,
      reject
    });
    
    // Start processing if queue is not being processed
    if (!isProcessingQueue) {
      processCommandQueue();
    }
  });
}

/**
 * Process queued commands sequentially
 */
async function processCommandQueue() {
  if (commandQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  const command = commandQueue.shift();
  
  try {
    // Wait a short time before executing next command
    await new Promise(resolve => setTimeout(resolve, 5));
    const result = await command.execute();
    command.resolve(result);
  } catch (error) {
    command.reject(error);
    console.error('Command execution error:', error);
  }
  
  // Continue processing next command in queue
  await processCommandQueue();
}

/**
 * Check if joint value is within URDF-defined limits
 * @param {Object} joint - Joint object
 * @param {number} newValue - New joint value in radians
 * @returns {boolean} True if within limits
 */
function isJointWithinLimits(joint, newValue) {
  // No limits for continuous or fixed joints
  if (joint.jointType === 'continuous' || joint.jointType === 'fixed') {
    return true;
  }
  
  // Also return true if joint has ignoreLimits flag
  if (joint.ignoreLimits) {
    return true;
  }
  
  // Check if joint value is within upper and lower limits
  // Note: For multi-DOF joints, need to check each value
  if (Array.isArray(newValue)) {
    // For multi-DOF joints like planar, floating etc.
    return true; // This case is complex, handle based on actual requirements
  } else {
    // For single-DOF joints like revolute or prismatic
    return newValue >= joint.limit.lower && newValue <= joint.limit.upper;
  }
}

/**
 * Setup keyboard controls for robot
 * @param {Object} robot - Robot object to control
 * @returns {Function} Joint update function for render loop
 */
export function setupKeyboardControls(robot) {
  const keyState = {};
  // Get the keyboard control section element
  const keyboardControlSection = document.getElementById('keyboardControlSection');
  let keyboardActiveTimeout;

  // Get initial stepSize from the HTML slider
  const speedControl = document.getElementById('speedControl');
  let stepSize = speedControl ? MathUtils.degToRad(parseFloat(speedControl.value)) : MathUtils.degToRad(0.2);
  
  // Default key-joint mappings
  const keyMappings = {
    '1': { jointIndex: 0, direction: 1 },
    'q': { jointIndex: 0, direction: -1 },
    '2': { jointIndex: 1, direction: 1 },
    'w': { jointIndex: 1, direction: -1 },
    '3': { jointIndex: 2, direction: 1 },
    'e': { jointIndex: 2, direction: -1 },
    '4': { jointIndex: 3, direction: 1 },
    'r': { jointIndex: 3, direction: -1 },
    '5': { jointIndex: 4, direction: 1 },
    't': { jointIndex: 4, direction: -1 },
    '6': { jointIndex: 5, direction: 1 },
    'y': { jointIndex: 5, direction: -1 },
  };

  // Mapping for button highlighting
  const keyToDataKeyMap = {
    '1': 'rotationPlus',
    'q': 'rotationMinus',
    '2': 'pitchPlus',
    'w': 'pitchMinus',
    '3': 'elbowPlus',
    'e': 'elbowMinus',
    '4': 'wristPitchPlus',
    'r': 'wristPitchMinus',
    '5': 'wristRollPlus',
    't': 'wristRollMinus',
    '6': 'jawPlus',
    'y': 'jawMinus'
  };
  
  // Get actual joint names from robot
  const jointNames = robot && robot.joints ? 
    Object.keys(robot.joints).filter(name => robot.joints[name].jointType !== 'fixed') : [];
  console.log('Available joints:', jointNames);
  
  // Function to set the div as active
  const setKeyboardSectionActive = () => {
    if (keyboardControlSection) {
      keyboardControlSection.classList.add('control-active');
      
      // Clear existing timeout if any
      if (keyboardActiveTimeout) {
        clearTimeout(keyboardActiveTimeout);
      }
      
      // Set timeout to remove the active class after 200ms of inactivity
      keyboardActiveTimeout = setTimeout(() => {
        keyboardControlSection.classList.remove('control-active');
      }, 200);
    }
  };
  
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keyState[key] = true;
    
    const dataKey = keyToDataKeyMap[key];
    if (dataKey) {
      const keyElement = document.querySelector(`.key[data-key="${dataKey}"]`);
      if (keyElement) {
        keyElement.classList.add('key-pressed');
        setKeyboardSectionActive();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keyState[key] = false;
    
    const dataKey = keyToDataKeyMap[key];
    if (dataKey) {
      const keyElement = document.querySelector(`.key[data-key="${dataKey}"]`);
      if (keyElement) {
        keyElement.classList.remove('key-pressed');
      }
    }
  });

  // 添加速度控制功能
  if (speedControl) {
    speedControl.addEventListener('input', (e) => {
      // 从滑块获取值 (0.5 到 10)，然后转换为弧度
      const speedFactor = parseFloat(e.target.value);
      stepSize = MathUtils.degToRad(speedFactor);
      
      // 更新速度显示
      const speedDisplay = document.getElementById('speedValue');
      if (speedDisplay) {
        speedDisplay.textContent = speedFactor.toFixed(1);
      }
    });
  }

  function updateJoints() {
    if (!robot || !robot.joints) return;

    let keyPressed = false;

    // Process each key mapping
    Object.keys(keyState).forEach(key => {
      if (keyState[key] && keyMappings[key]) {
        keyPressed = true;
        const { jointIndex, direction } = keyMappings[key];
        
        // Get joint name by index (if available)
        if (jointIndex < jointNames.length) {
          const jointName = jointNames[jointIndex];
          
          // Check if joint exists in robot
          if (robot.joints[jointName]) {
            // If connected to real robot, first check if servo has error state
            const servoId = jointIndex + 1;
            if (isConnectedToRealRobot && servoCommStatus[servoId].status === 'error') {
              console.warn(`Servo ${servoId} is in error state. Virtual movement prevented.`);
              return; // Skip updating this joint
            }
            
            // Get current joint value
            const currentValue = robot.joints[jointName].angle;
            // Calculate new joint value
            const newValue = currentValue + (direction * stepSize);
            
            // Check if exceeding joint limits
            if (!isJointWithinLimits(robot.joints[jointName], newValue)) {
              console.warn(`Joint ${jointName} would exceed its limits. Movement prevented.`);
              // Show virtual joint limit alert
              showAlert('joint', `Joint ${jointName} has reached its limit!`);
              return; // Skip updating this joint
            }
            
            // Calculate servo values
            const effectiveDirection = servoDirectionMapping[servoId] ? -direction : direction;
            const stepChange = Math.round((effectiveDirection * stepSize) * (4096 / (2 * Math.PI)));
            let newPosition = (servoCurrentPositions[servoId] + stepChange) % 4096;

            // Update visualization immediately
            robot.joints[jointName].setJointValue(newValue);
            robot.updateMatrixWorld(true);
            
            // If connected to real robot, control real servo
            if (isConnectedToRealRobot) {
              // Store servo position
              servoCurrentPositions[servoId] = newPosition;
              
              // Update servo status to pending
              servoCommStatus[servoId].status = 'pending';
              updateServoStatusUI(servoId, servoCommStatus[servoId].status, servoCommStatus[servoId].lastError);
              
              // Use queue system to control servo, prevent concurrent access
              writeServoPosition(servoId, newPosition)
                .then(success => {
                  if (success) {
                    // Update last safe position
                    servoLastSafePositions[servoId] = newPosition;

                    // Update servo status to success
                    servoCommStatus[servoId].status = 'success';
                    updateServoStatusUI(servoId, servoCommStatus[servoId].status, servoCommStatus[servoId].lastError);
                  } else {
                    // If servo movement failed, restore current position record
                    servoCurrentPositions[servoId] = servoLastSafePositions[servoId];
                    console.warn(`Failed to move servo ${servoId}. Virtual joint not updated.`);
                    
                    // Show servo error alert
                    showAlert('servo', `Servo ${servoId} movement failed!`);
                    
                    // Try to move servo back to last safe position
                    if (servoLastSafePositions[servoId] !== servoCurrentPositions[servoId]) {
                      console.log(`Attempting to move servo ${servoId} back to last safe position...`);
                      writeServoPosition(servoId, servoLastSafePositions[servoId], true)
                        .then(recoverySuccess => {
                          if (recoverySuccess) {
                            console.log(`Successfully moved servo ${servoId} back to safe position.`);
                            servoCurrentPositions[servoId] = servoLastSafePositions[servoId];
                          } else {
                            console.error(`Failed to move servo ${servoId} back to safe position.`);
                            // Show servo recovery error alert
                            showAlert('servo', `Servo ${servoId} could not recover to safe position!`, 4000);
                          }
                        })
                        .catch(error => {
                          console.error(`Error moving servo ${servoId} back to safe position:`, error);
                          // Show servo recovery error alert
                          showAlert('servo', `Error recovering servo ${servoId}: ${error.message || 'Unknown error'}`, 4000);
                        });
                    }
                  }
                })
                .catch(error => {
                  // Servo control failed, don't update virtual joint, restore current position record
                  servoCurrentPositions[servoId] = servoLastSafePositions[servoId];
                  console.error(`Error controlling servo ${servoId}:`, error);
                  servoCommStatus[servoId].status = 'error';
                  servoCommStatus[servoId].lastError = error.message || 'Communication error';
                  updateServoStatusUI(servoId, servoCommStatus[servoId].status, servoCommStatus[servoId].lastError);
                  
                  // Show servo error alert
                  showAlert('servo', `Servo ${servoId} error: ${error.message || 'Communication failed'}`);
                  
                  // Try to move servo back to last safe position
                  if (servoLastSafePositions[servoId] !== servoCurrentPositions[servoId]) {
                    console.log(`Attempting to move servo ${servoId} back to last safe position...`);
                    writeServoPosition(servoId, servoLastSafePositions[servoId], true)
                      .then(recoverySuccess => {
                        if (recoverySuccess) {
                          console.log(`Successfully moved servo ${servoId} back to safe position.`);
                          servoCurrentPositions[servoId] = servoLastSafePositions[servoId];
                        } else {
                          console.error(`Failed to move servo ${servoId} back to safe position.`);
                          // Show servo recovery error alert
                          showAlert('servo', `Servo ${servoId} could not recover to safe position!`, 4000);
                        }
                      })
                      .catch(error => {
                        console.error(`Error moving servo ${servoId} back to safe position:`, error);
                        // Show servo recovery error alert
                        showAlert('servo', `Error recovering servo ${servoId}: ${error.message || 'Unknown error'}`, 4000);
                      });
                  }
                });
            } else {
              // If not connected to real robot, directly update virtual joint
              robot.joints[jointName].setJointValue(newValue);
            }
          }
        }
      }
    });

    // If any key is pressed, set the keyboard section as active
    if (keyPressed) {
      setKeyboardSectionActive();
    }

    // Update robot
    if (robot.updateMatrixWorld) {
      robot.updateMatrixWorld(true);
    }
  }

  // Return update function for use in render loop
  return updateJoints;
}

/**
 * Setup gamepad controls for robot
 * @param {Object} robot - Robot object to control
 * @returns {Function} Joint update function for render loop
 */
export function setupGamepadControls(robot) {
  let gamepad = null;
  let isGamepadConnected = false;
  const gamepadControlSection = document.getElementById('gamepadControlSection');
  const connectButton = document.getElementById('connectGamepad');
  let gamepadActiveTimeout;

  // Get initial stepSize from the HTML slider
  const speedControl = document.getElementById('speedControl');
  let stepSize = speedControl ? MathUtils.degToRad(parseFloat(speedControl.value)) : MathUtils.degToRad(0.2);

  // Get joint names from robot
  const jointNames = robot && robot.joints ? 
      Object.keys(robot.joints).filter(name => robot.joints[name].jointType !== 'fixed') : [];
  console.log('Available joints:', jointNames);

  // Update stepSize when speed control changes
  if (speedControl) {
      speedControl.addEventListener('input', (e) => {
          stepSize = MathUtils.degToRad(parseFloat(e.target.value));
      });
  }

  // Button mappings for gamepad controls
  const buttonPairs = [
      { buttons: [2, 1], labels: ['rotationPlus', 'rotationMinus'] }, // Face-Left: 2, Face-Right: 1
      { buttons: [3, 0], labels: ['pitchPlus', 'pitchMinus'] }, // Face-Top: 3, Face-Bottom: 0
      { buttons: [7, 5], labels: ['elbowPlus', 'elbowMinus'] }, // R2: 7, R1: 5
      { buttons: [12, 13], labels: ['wristPitchPlus', 'wristPitchMinus'] }, // Up: 12, Down: 13
      { buttons: [14, 15], labels: ['wristRollPlus', 'wristRollMinus'] }, // Left: 14, Right: 15
      { buttons: [6, 4], labels: ['jawPlus', 'jawMinus'] } // L2: 6, L1: 4
  ];

  // Create gamepad mappings dynamically from URDF joint names
  const gamepadMappings = {};
  jointNames.forEach((jointName, index) => {
      if (index < buttonPairs.length) {
          gamepadMappings[jointName] = {
              jointIndex: index,
              ...buttonPairs[index]
          };
      }
  });

  // Function to set the gamepad section as active
  const setGamepadSectionActive = () => {
      if (gamepadControlSection) {
          gamepadControlSection.classList.add('control-active');
          
          // Clear existing timeout if any
          if (gamepadActiveTimeout) {
              clearTimeout(gamepadActiveTimeout);
          }
          
          // Set new timeout
          gamepadActiveTimeout = setTimeout(() => {
              gamepadControlSection.classList.remove('control-active');
          }, 200);
      }
  };

  // Function to handle gamepad connection
  const connectGamepad = () => {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
          if (gp && !gamepad) {
              gamepad = gp;
              isGamepadConnected = true;
              connectButton.textContent = 'Gamepad Connected';
              connectButton.classList.add('connected');
              break;
          }
      }
  };

  // Function to handle gamepad disconnection
  const disconnectGamepad = () => {
      gamepad = null;
      isGamepadConnected = false;
      connectButton.textContent = 'Connect Gamepad';
      connectButton.classList.remove('connected');
  };

  // Add event listeners for gamepad connection/disconnection
  window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad);
      if (!isGamepadConnected) {
          connectGamepad();
      }
  });

  window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad);
      disconnectGamepad();
  });

  // Add click handler for connect button
  if (connectButton) {
      connectButton.addEventListener('click', () => {
          if (!isGamepadConnected) {
              connectGamepad();
          } else {
              disconnectGamepad();
          }
      });
  }

  // Function to update button labels based on gamepad type
  const updateButtonLabels = (gamepadType) => {
      const buttons = document.querySelectorAll('.key[data-ps]');
      buttons.forEach(button => {
          const label = button.getAttribute(`data-${gamepadType}`);
          if (label) {
              button.textContent = label;
          }
      });
  };

  // Add event listener for gamepad type selector
  const gamepadTypeSelect = document.getElementById('gamepadType');
  if (gamepadTypeSelect) {
      gamepadTypeSelect.addEventListener('change', (e) => {
          currentGamepadType = e.target.value;
          updateButtonLabels(currentGamepadType);
      });
      // Initialize with default value
      updateButtonLabels(currentGamepadType);
  }

  // Function to update joints based on gamepad input
  function updateJoints() {
      if (!isGamepadConnected || !gamepad || !robot || !robot.joints) {
          return;
      }

      // Update gamepad state
      gamepad = navigator.getGamepads()[gamepad.index];
      if (!gamepad) {
          return;
      }

      let hasInput = false;

      // Handle button inputs
      const handleButtonPair = (mapping, jointType) => {
          const [buttonPlus, buttonMinus] = mapping.buttons;
          const [labelPlus, labelMinus] = mapping.labels;
          const buttonPlusPressed = gamepad.buttons[buttonPlus].pressed;
          const buttonMinusPressed = gamepad.buttons[buttonMinus].pressed;

          // Get current gamepad type
          const currentGamepadType = gamepadTypeSelect ? gamepadTypeSelect.value : 'ps';

          // Highlight buttons based on press state using current gamepad type
          const plusElement = document.querySelector(`.key[data-key="${labelPlus}"][data-${currentGamepadType}]`);
          const minusElement = document.querySelector(`.key[data-key="${labelMinus}"][data-${currentGamepadType}]`);
          
          if (plusElement) {
              if (buttonPlusPressed) {
                  plusElement.classList.add('key-pressed');
                  setGamepadSectionActive();
              } else {
                  plusElement.classList.remove('key-pressed');
              }
          }
          if (minusElement) {
              if (buttonMinusPressed) {
                  minusElement.classList.add('key-pressed');
                  setGamepadSectionActive();
              } else {
                  minusElement.classList.remove('key-pressed');
              }
          }

          if (buttonPlusPressed || buttonMinusPressed) {
              hasInput = true;
              const jointName = jointNames[mapping.jointIndex];
              if (jointName && robot.joints[jointName]) {
                  const joint = robot.joints[jointName];
                  const direction = buttonPlusPressed ? 1 : -1;
                  const newValue = joint.angle + (direction * stepSize);
                  
                  // Check joint limits and show alert if needed
                  if (isJointWithinLimits(joint, newValue)) {
                      // Calculate new values
                      const effectiveDirection = servoDirectionMapping[mapping.jointIndex + 1] ? -direction : direction;
                      const stepChange = Math.round((effectiveDirection * stepSize) * (4096 / (2 * Math.PI)));
                      let newPosition = (servoCurrentPositions[mapping.jointIndex + 1] + stepChange) % 4096;

                      // Update visualization immediately
                      robot.joints[jointName].setJointValue(newValue);
                      robot.updateMatrixWorld(true);
                      
                      // If connected to real robot, control real servo
                      if (isConnectedToRealRobot) {
                        // Store servo position
                        servoCurrentPositions[mapping.jointIndex + 1] = newPosition;
                        
                        // Update servo status to pending
                        servoCommStatus[mapping.jointIndex + 1].status = 'pending';
                        updateServoStatusUI(mapping.jointIndex + 1, servoCommStatus[mapping.jointIndex + 1].status, servoCommStatus[mapping.jointIndex + 1].lastError);
                        
                        // Use queue system to control servo, prevent concurrent access
                        writeServoPosition(mapping.jointIndex + 1, newPosition)
                          .then(success => {
                            if (success) {
                              // Update last safe position
                              servoLastSafePositions[mapping.jointIndex + 1] = newPosition;

                              // Update servo status to success
                              servoCommStatus[mapping.jointIndex + 1].status = 'success';
                              updateServoStatusUI(mapping.jointIndex + 1, servoCommStatus[mapping.jointIndex + 1].status, servoCommStatus[mapping.jointIndex + 1].lastError);
                            } else {
                              // If servo movement failed, restore current position record
                              servoCurrentPositions[mapping.jointIndex + 1] = servoLastSafePositions[mapping.jointIndex + 1];
                              console.warn(`Failed to move servo ${mapping.jointIndex + 1}. Virtual joint not updated.`);
                              
                              // Show servo error alert
                              showAlert('servo', `Servo ${mapping.jointIndex + 1} movement failed!`);
                              
                              // Try to move servo back to last safe position
                              if (servoLastSafePositions[mapping.jointIndex + 1] !== servoCurrentPositions[mapping.jointIndex + 1]) {
                                console.log(`Attempting to move servo ${mapping.jointIndex + 1} back to last safe position...`);
                                writeServoPosition(mapping.jointIndex + 1, servoLastSafePositions[mapping.jointIndex + 1], true)
                                  .then(recoverySuccess => {
                                    if (recoverySuccess) {
                                      console.log(`Successfully moved servo ${mapping.jointIndex + 1} back to safe position.`);
                                      servoCurrentPositions[mapping.jointIndex + 1] = servoLastSafePositions[mapping.jointIndex + 1];
                                    } else {
                                      console.error(`Failed to move servo ${mapping.jointIndex + 1} back to safe position.`);
                                      // Show servo recovery error alert
                                      showAlert('servo', `Servo ${mapping.jointIndex + 1} could not recover to safe position!`, 4000);
                                    }
                                  })
                                  .catch(error => {
                                    console.error(`Error moving servo ${mapping.jointIndex + 1} back to safe position:`, error);
                                    // Show servo recovery error alert
                                    showAlert('servo', `Error recovering servo ${mapping.jointIndex + 1}: ${error.message || 'Unknown error'}`, 4000);
                                  });
                              }
                            }
                          })
                          .catch(error => {
                            // Servo control failed, don't update virtual joint, restore current position record
                            servoCurrentPositions[mapping.jointIndex + 1] = servoLastSafePositions[mapping.jointIndex + 1];
                            console.error(`Error controlling servo ${mapping.jointIndex + 1}:`, error);
                            servoCommStatus[mapping.jointIndex + 1].status = 'error';
                            servoCommStatus[mapping.jointIndex + 1].lastError = error.message || 'Communication error';
                            updateServoStatusUI(mapping.jointIndex + 1, servoCommStatus[mapping.jointIndex + 1].status, servoCommStatus[mapping.jointIndex + 1].lastError);

                            // Show servo error alert
                            showAlert('servo', `Servo ${mapping.jointIndex + 1} error: ${error.message || 'Communication failed'}`);

                            // Try to move servo back to last safe position
                            if (servoLastSafePositions[mapping.jointIndex + 1] !== servoCurrentPositions[mapping.jointIndex + 1]) {
                              console.log(`Attempting to move servo ${mapping.jointIndex + 1} back to last safe position...`);
                              writeServoPosition(mapping.jointIndex + 1, servoLastSafePositions[mapping.jointIndex + 1], true)
                                .then(recoverySuccess => {
                                  if (recoverySuccess) {
                                    console.log(`Successfully moved servo ${mapping.jointIndex + 1} back to safe position.`);
                                    servoCurrentPositions[mapping.jointIndex + 1] = servoLastSafePositions[mapping.jointIndex + 1];
                                  } else {
                                    console.error(`Failed to move servo ${mapping.jointIndex + 1} back to safe position.`);
                                    // Show servo recovery error alert
                                    showAlert('servo', `Servo ${mapping.jointIndex + 1} could not recover to safe position!`, 4000);
                                  }
                                })
                                .catch(error => {
                                  console.error(`Error moving servo ${mapping.jointIndex + 1} back to safe position:`, error);
                                  // Show servo recovery error alert
                                  showAlert('servo', `Error recovering servo ${mapping.jointIndex + 1}: ${error.message || 'Unknown error'}`, 4000);
                                });
                            }
                          });
                      } else {
                          // If not connected to real robot, just update virtual joint
                          joint.setJointValue(newValue);
                      }
                  } else {
                      showAlert('joint', `Joint ${jointType} has reached its limit!`);
                  }
              }
          }
      };

      // Process all mappings using button pairs
      jointNames.forEach(jointName => {
          if (gamepadMappings[jointName]) {
              handleButtonPair(gamepadMappings[jointName], jointName);
          }
      });

      if (hasInput) {
          setGamepadSectionActive();
          robot.updateMatrixWorld(true);
      }
  }

  return updateJoints;
}

/**
 * Setup control panel UI elements
 */
export function setupControlPanel() {
  const controlPanel = document.getElementById('controlPanel');
  const togglePanel = document.getElementById('togglePanel');
  const hideControls = document.getElementById('hideControls');

  // 处理折叠/展开控制面板
  if (hideControls) {
    hideControls.addEventListener('click', () => {
      controlPanel.style.display = 'none';
      togglePanel.style.display = 'block';
    });
  }

  if (togglePanel) {
    togglePanel.addEventListener('click', () => {
      controlPanel.style.display = 'block';
      togglePanel.style.display = 'none';
    });
  }

  // 初始化速度显示
  const speedDisplay = document.getElementById('speedValue');
  const speedControl = document.getElementById('speedControl');
  if (speedDisplay && speedControl) {
    speedDisplay.textContent = speedControl.value;
  }
  
  // 设置可折叠部分的逻辑
  setupCollapsibleSections();

  // 添加真实机器人连接事件处理
  const connectButton = document.getElementById('connectRealRobot');
  if (connectButton) {
    connectButton.addEventListener('click', toggleRealRobotConnection);
  }
  
  // Joycon和VR连接按钮的占位处理（未来实现）
  const connectJoyconButton = document.getElementById('connectJoycon');
  if (connectJoyconButton) {
    connectJoyconButton.addEventListener('click', () => {
      console.log('Joycon connection not yet implemented');
      alert('Joycon connection will be implemented in the future.');
    });
  }
  
  const connectVRButton = document.getElementById('connectVR');
  if (connectVRButton) {
    connectVRButton.addEventListener('click', () => {
      console.log('VR connection not yet implemented');
      alert('VR connection will be implemented in the future.');
    });
  }
}

/**
 * Initialize collapsible sections in the UI
 */
function setupCollapsibleSections() {
  // 获取所有可折叠部分的标头
  const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
  
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', () => {
      // 切换当前可折叠部分的打开/关闭状态
      const section = header.parentElement;
      section.classList.toggle('open');
    });
  });
}

/**
 * Handle servo errors and update status
 * @param {number} servoId - Servo ID
 * @param {number} result - Operation result code
 * @param {string} error - Error message
 * @param {string} operation - Operation description
 * @param {boolean} [isWarning=false] - Treat as warning instead of error
 * @returns {boolean} True if operation successful
 */
function handleServoError(servoId, result, error, operation, isWarning = false) {
  if (!servoCommStatus[servoId]) return false;
  
  if (result === COMM_SUCCESS && !isWarning) {
    servoCommStatus[servoId].status = 'success';
    servoCommStatus[servoId].lastError = null;
    return true;
  }
  
  // 设置状态（警告或错误）
  servoCommStatus[servoId].status = isWarning ? 'warning' : 'error';
  
  // 构造状态前缀
  const statusPrefix = isWarning ? '' : (result !== COMM_SUCCESS ? 'Communication failed' : '');
  
  let errorMessage = '';
  
  // 检查错误码
  if (error & ERRBIT_OVERLOAD) {
    errorMessage = `${statusPrefix}${statusPrefix ? ': ' : ''}Overload or stuck`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with overload error (${error})`);
  } else if (error & ERRBIT_OVERHEAT) {
    errorMessage = `${statusPrefix}${statusPrefix ? ': ' : ''}Overheat`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with overheat error (${error})`);
  } else if (error & ERRBIT_VOLTAGE) {
    errorMessage = `${statusPrefix}${statusPrefix ? ': ' : ''}Voltage error`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with voltage error (${error})`);
  } else if (error & ERRBIT_ANGLE) {
    errorMessage = `${statusPrefix}${statusPrefix ? ': ' : ''}Angle sensor error`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with angle sensor error (${error})`);
  } else if (error & ERRBIT_OVERELE) {
    errorMessage = `${statusPrefix}${statusPrefix ? ': ' : ''}Overcurrent`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with overcurrent error (${error})`);
  } else if (error !== 0 || result !== COMM_SUCCESS) {
    errorMessage = `${statusPrefix}${statusPrefix ? ': ' : ''}${isWarning ? 'Unknown error' : operation + ' failed'}`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${isWarning ? 'returned unknown error code' : operation + ' failed'}: ${error}`);
  } else {
    // 不太可能到达这里，但以防万一
    servoCommStatus[servoId].status = 'success';
    servoCommStatus[servoId].lastError = null;
    return true;
  }
  
  // 在UI上显示错误提醒，严重错误才弹出提醒
  if (!isWarning || error & (ERRBIT_OVERLOAD | ERRBIT_OVERHEAT | ERRBIT_VOLTAGE)) {
    showAlert('servo', `Servo ${servoId}: ${errorMessage}`);
  }
  
  updateServoStatusUI(servoId, servoCommStatus[servoId].status, servoCommStatus[servoId].lastError);
  return false;
}

/**
 * Toggle connection to real robot
 * @returns {Promise<boolean>} Connection success
 */
async function toggleRealRobotConnection() {
  const connectButton = document.getElementById('connectRealRobot');
  const servoStatusContainer = document.getElementById('servoStatusContainer');
  
  if (!connectButton) return;
  
  if (!isConnectedToRealRobot) {
    try {
      // Create new instances if needed
      if (!portHandler) portHandler = new PortHandler();
      
      // 使用固定的协议类型 SCS(1)
      const protocolEnd = 1;
      if (!packetHandler || packetHandler.getProtocolEnd() !== protocolEnd) {
        packetHandler = new PacketHandler(protocolEnd);
      }
      
      // Request serial port
      connectButton.disabled = true;
      connectButton.textContent = 'Connecting...';
      
      // 重置所有舵机状态为idle
      for (let servoId = 1; servoId <= 6; servoId++) {
        servoCommStatus[servoId] = { status: 'idle', lastError: null };
      }
      updateServoStatusUI();
      
      // 显示舵机状态区域
      if (servoStatusContainer) {
        servoStatusContainer.style.display = 'block';
        // 确保状态面板默认是打开的
        servoStatusContainer.classList.add('open');
      }
      
      const success = await portHandler.requestPort();
      if (!success) {
        throw new Error('Failed to select port');
      }
      
      // 使用固定波特率 1000000
      const baudrate = 1000000;
      portHandler.setBaudRate(baudrate);
      
      // Open the port
      const opened = await portHandler.openPort();
      if (!opened) {
        throw new Error('Failed to open port');
      }
      
      // 清空命令队列
      commandQueue = [];
      isProcessingQueue = false;
      
      // Set initial parameters for servos (e.g. acceleration)
      for (let servoId = 1; servoId <= 6; servoId++) {
        try {
          // 更新舵机状态为处理中
          servoCommStatus[servoId].status = 'pending';
          updateServoStatusUI();
          
          // 先启用扭矩 - 集中一次性处理
          await writeTorqueEnable(servoId, 1);
          
          // 按顺序执行，等待每个操作完成
          await writeServoAcceleration(servoId, 10);
          await writeServoSpeed(servoId, 300);
          
          // 读取当前位置并保存
          const currentPosition = await readServoPosition(servoId);
          if (currentPosition !== null) {
            servoCurrentPositions[servoId] = currentPosition;
            // 同时设置为最后安全位置
            servoLastSafePositions[servoId] = currentPosition;
            console.log(`Servo ${servoId} current position: ${currentPosition}`);
            
            // 读取成功，更新状态为success
            servoCommStatus[servoId].status = 'success';
          } else {
            console.warn(`Could not read current position for Servo ${servoId}, using default 0`);
            
            // 读取失败，更新状态为error
            servoCommStatus[servoId].status = 'error';
            servoCommStatus[servoId].lastError = 'Failed to read initial position';
          }
          updateServoStatusUI();
        } catch (err) {
          console.warn(`Error initializing servo ${servoId}:`, err);
          servoCommStatus[servoId].status = 'error';
          servoCommStatus[servoId].lastError = err.message || 'Initialization error';
          updateServoStatusUI();
        }
      }
      
      // Update UI
      connectButton.classList.add('connected');
      connectButton.textContent = 'Disconnect Robot';
      isConnectedToRealRobot = true;
      
    } catch (error) {
      console.error('Connection error:', error);
      alert(`Failed to connect: ${error.message}`);
      connectButton.textContent = 'Connect Real Robot';
      connectButton.classList.remove('connected');
      
      // 显示连接错误提醒
      showAlert('servo', `Failed to connect to robot: ${error.message}`, 5000);
      
      // 连接失败，更新所有舵机状态为error
      for (let servoId = 1; servoId <= 6; servoId++) {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = error.message || 'Connection failed';
      }
      updateServoStatusUI();
    } finally {
      connectButton.disabled = false;
    }
  } else {
    // Disconnect
    try {
      // 清空命令队列
      commandQueue = [];
      isProcessingQueue = false;
      
      if (portHandler && portHandler.isOpen) {
        // Turn off torque before closing
        for (let servoId = 1; servoId <= 6; servoId++) {
          try {
            await writeTorqueEnable(servoId, 0);
          } catch (err) {
            console.warn(`Error disabling torque for servo ${servoId}:`, err);
          }
        }
        
        await portHandler.closePort();
      }
      
      // 重置所有舵机状态和位置信息
      for (let servoId = 1; servoId <= 6; servoId++) {
        servoCommStatus[servoId] = { status: 'idle', lastError: null };
        servoCurrentPositions[servoId] = 0;
        servoLastSafePositions[servoId] = 0;
      }
      
      // 隐藏舵机状态区域
      if (servoStatusContainer) {
        servoStatusContainer.style.display = 'none';
      }
      
      // Update UI
      connectButton.classList.remove('connected');
      connectButton.textContent = 'Connect Real Robot';
      isConnectedToRealRobot = false;
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }
}

/**
 * Read current position from servo
 * @param {number} servoId - Servo ID (1-6)
 * @returns {Promise<number|null>} Position (0-4095) or null if failed
 */
async function readServoPosition(servoId) {
  if (!portHandler || !packetHandler) return null;
  
  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      if (servoCommStatus[servoId]) {
        servoCommStatus[servoId].status = 'pending';
        servoCommStatus[servoId].lastError = null;
        updateServoStatusUI();
      }
      
      // 读取当前位置
      const [rawPosition, result, error] = await packetHandler.read4ByteTxRx(
        portHandler,
        servoId,
        ADDR_SCS_PRESENT_POSITION
      );
      
      // 使用通用错误处理函数
      if (!handleServoError(servoId, result, error, 'position reading')) {
        return null;
      }
      
      // 修复字节顺序问题 - 通常SCS舵机使用小端序(Little Endian)
      // 从0xD04变为0x40D (从3332变为1037)
      // 我们只关心最低的两个字节，所以可以通过位运算修复
      const lowByte = (rawPosition & 0xFF00) >> 8;  // 取高字节并右移到低位
      const highByte = (rawPosition & 0x00FF) << 8; // 取低字节并左移到高位
      let position = (rawPosition & 0xFFFF0000) | highByte | lowByte;
      
      // 输出调试信息
      console.log(`Servo ${servoId} raw: 0x${rawPosition.toString(16)}, fixed: 0x${position.toString(16)}`);
      
      return position & 0xFFFF; // 只取低16位，这是舵机位置的有效范围
    } catch (error) {
      console.error(`Error reading position from servo ${servoId}:`, error);
      
      // 更新舵机状态为错误
      if (servoCommStatus[servoId]) {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = error.message || 'Communication error';
        updateServoStatusUI();
      }
      
      return null;
    }
  });
}

/**
 * Write torque enable value directly to servo
 * @param {number} servoId - Servo ID (1-6)
 * @param {boolean} enable - Enable/disable torque
 */
async function writeTorqueEnableRaw(servoId, enable) {
  if (!portHandler || !packetHandler) return;
  
  try {
    const [result, error] = await packetHandler.write1ByteTxRx(
      portHandler, 
      servoId, 
      ADDR_SCS_TORQUE_ENABLE, 
      enable ? 1 : 0
    );
    
    if (result !== COMM_SUCCESS) {
      console.error(`Failed to write torque enable to servo ${servoId}: ${error}`);
    }
  } catch (error) {
    console.error(`Error writing torque enable to servo ${servoId}:`, error);
  }
}

/**
 * Write position to servo with direction mapping
 * @param {number} servoId - Servo ID (1-6)
 * @param {number} position - Target position (0-4095)
 * @param {boolean} [skipLimitCheck=false] - Skip limit checking for recovery
 */
async function writeServoPosition(servoId, position, skipLimitCheck = false) {
  if (!isConnectedToRealRobot || !portHandler || !packetHandler) return;
  
  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      servoCommStatus[servoId].status = 'pending';
      servoCommStatus[servoId].lastError = null;
      updateServoStatusUI();
      
      // Write position to servo
      position = Math.max(0, Math.min(4095, position)); // Clamp to valid range
      
      // 修复字节顺序问题 - 通常SCS舵机使用小端序(Little Endian)
      // 从0x40D变为0xD04 (从1037变为3332)
      // 我们只需要修正低16位中的字节顺序
      const lowByte = (position & 0xFF00) >> 8;  // 取高字节并右移到低位
      const highByte = (position & 0x00FF) << 8; // 取低字节并左移到高位
      const finalPosition = (position & 0xFFFF0000) | highByte | lowByte;
      
      const [result, error] = await packetHandler.write4ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_POSITION, 
        finalPosition & 0xFFFF // 只使用低16位
      );
      
      // 使用通用错误处理函数，通信成功但有错误时作为警告处理
      const isSuccess = result === COMM_SUCCESS;
      if (isSuccess && error !== 0) {
        // 通信成功但有硬件警告
        handleServoError(servoId, result, error, 'position control', true);
      } else {
        // 通信失败或无错误
        handleServoError(servoId, result, error, 'position control');
      }
      
      return isSuccess;
    } catch (error) {
      console.error(`Error writing position to servo ${servoId}:`, error);
      servoCommStatus[servoId].status = 'error';
      servoCommStatus[servoId].lastError = error.message || 'Communication error';
      updateServoStatusUI();
      throw error;
    }
  });
}

/**
 * Write acceleration value to servo
 * @param {number} servoId - Servo ID (1-6)
 * @param {number} acceleration - Acceleration value
 */
async function writeServoAcceleration(servoId, acceleration) {
  if (!isConnectedToRealRobot || !portHandler || !packetHandler) return;
  
  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      servoCommStatus[servoId].status = 'pending';
      servoCommStatus[servoId].lastError = null;
      updateServoStatusUI();
      
      acceleration = Math.max(0, Math.min(254, acceleration)); // Clamp to valid range
      
      const [result, error] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_ACC, 
        acceleration
      );
      
      // 使用通用错误处理函数
      return handleServoError(servoId, result, error, 'acceleration control');
    } catch (error) {
      console.error(`Error writing acceleration to servo ${servoId}:`, error);
      servoCommStatus[servoId].status = 'error';
      servoCommStatus[servoId].lastError = error.message || 'Communication error';
      updateServoStatusUI();
      throw error;
    }
  });
}

/**
 * Write speed value to servo
 * @param {number} servoId - Servo ID (1-6)
 * @param {number} speed - Speed value
 */
async function writeServoSpeed(servoId, speed) {
  if (!isConnectedToRealRobot || !portHandler || !packetHandler) return;
  
  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      servoCommStatus[servoId].status = 'pending';
      servoCommStatus[servoId].lastError = null;
      updateServoStatusUI();
      
      speed = Math.max(0, Math.min(2000, speed)); // Clamp to valid range
      
      const [result, error] = await packetHandler.write2ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_SPEED, 
        speed
      );
      
      // 使用通用错误处理函数
      return handleServoError(servoId, result, error, 'speed control');
    } catch (error) {
      console.error(`Error writing speed to servo ${servoId}:`, error);
      servoCommStatus[servoId].status = 'error';
      servoCommStatus[servoId].lastError = error.message || 'Communication error';
      updateServoStatusUI();
      throw error;
    }
  });
}

/**
 * Enable/disable servo torque with status update
 * @param {number} servoId - Servo ID (1-6)
 * @param {boolean} enable - Enable/disable torque
 */
async function writeTorqueEnable(servoId, enable) {
  if (!isConnectedToRealRobot || !portHandler || !packetHandler) return;
  
  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      servoCommStatus[servoId].status = 'pending';
      servoCommStatus[servoId].lastError = null;
      updateServoStatusUI();
      
      const [result, error] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_TORQUE_ENABLE, 
        enable ? 1 : 0
      );
      
      // 使用通用错误处理函数
      return handleServoError(servoId, result, error, 'torque control');
    } catch (error) {
      console.error(`Error writing torque enable to servo ${servoId}:`, error);
      servoCommStatus[servoId].status = 'error';
      servoCommStatus[servoId].lastError = error.message || 'Communication error';
      updateServoStatusUI();
      throw error;
    }
  });
}

/**
 * Update servo status in UI
 * @param {number} servoId - Servo ID
 * @param {string} status - Status string
 * @param {string} [error=null] - Error message
 */
function updateServoStatusUI(servoId, status, error = null) {
    const statusElement = document.getElementById(`servo-${servoId}-status`);
    const errorElement = document.getElementById(`servo-${servoId}-error`);
    const directionToggle = document.querySelector(`.direction-toggle[data-servo-id="${servoId}"]`);
    
    if (!statusElement || !errorElement || !directionToggle) return;

    // Update status text and color
    statusElement.textContent = status.toLowerCase();
    statusElement.className = 'servo-status';
    
    switch (status.toLowerCase()) {
        case 'success':
            statusElement.style.color = '#4CAF50';
            break;
        case 'error':
            statusElement.style.color = '#F44336';
            break;
        case 'pending':
            statusElement.style.color = '#2196F3';
            break;
        case 'warning':
            statusElement.style.color = '#FF9800';
            break;
        default:
            statusElement.style.color = '#9E9E9E';
    }

    // Update error message if present
    if (error) {
        errorElement.textContent = error;
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }

    // Update direction toggle button state
    updateDirectionToggleState(directionToggle, servoId, status.toLowerCase());
}

/**
 * Update all direction toggle button states
 */
function updateDirectionToggleStates() {
    const toggleButtons = document.querySelectorAll('.direction-toggle');
    toggleButtons.forEach(button => {
        const servoId = parseInt(button.dataset.servoId);
        const status = document.getElementById(`servo-${servoId}-status`).textContent.toLowerCase();
        updateDirectionToggleState(button, servoId, status);
    });
}

/**
 * Update single direction toggle button state
 * @param {HTMLElement} button - Toggle button element
 * @param {number} servoId - Servo ID
 * @param {string} status - Servo status
 */
function updateDirectionToggleState(button, servoId, status) {
    // Only enable if status is exactly 'idle'
    button.disabled = status !== 'idle';
    
    // Maintain inverted state regardless of enabled/disabled
    if (servoDirectionMapping[servoId]) {
        button.classList.add('inverted');
    } else {
        button.classList.remove('inverted');
    }
}

/**
 * Initialize direction toggle buttons with event handlers
 */
function initDirectionToggles() {
    const toggleButtons = document.querySelectorAll('.direction-toggle');
    toggleButtons.forEach(button => {
        const servoId = parseInt(button.dataset.servoId);
        
        // Set initial state
        updateDirectionToggleState(button, servoId, 'idle');
        
        // Add click handler
        button.addEventListener('click', () => {
            if (!button.disabled) {
                servoDirectionMapping[servoId] = !servoDirectionMapping[servoId];
                updateDirectionToggleState(button, servoId, 'idle');
                
                // Save to localStorage
                localStorage.setItem('servoDirectionMapping', JSON.stringify(servoDirectionMapping));
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize direction toggle buttons
    initDirectionToggles();
});