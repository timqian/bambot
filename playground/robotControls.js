import { MathUtils } from 'three';
// Import feetech SDK for real servo control
import { 
  PortHandler, 
  PacketHandler
} from './feetech/scsservo_sdk.mjs';
// Import constants from our constants file
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
// Import Joy-Con WebHID library
import {
  connectJoyCon,
  connectedJoyCons,
  JoyConLeft,
  JoyConRight,
  GeneralController,
} from 'joy-con-webhid';
// Import language system
import { initLanguageSystem, t } from './language.js';

// Servo control variables
let portHandler = null;
let packetHandler = null;
let isConnectedToRealRobot = false;

// 存储真实舵机的当前位置
let servoCurrentPositions = {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
};

// 存储真实舵机的最后一个安全位置
let servoLastSafePositions = {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
};

// 舵机通信状态
let servoCommStatus = {
  1: { status: 'idle', lastError: null },
  2: { status: 'idle', lastError: null },
  3: { status: 'idle', lastError: null },
  4: { status: 'idle', lastError: null },
  5: { status: 'idle', lastError: null },
  6: { status: 'idle', lastError: null },
  7: { status: 'idle', lastError: null },
  8: { status: 'idle', lastError: null },
  9: { status: 'idle', lastError: null },
  10: { status: 'idle', lastError: null },
  11: { status: 'idle', lastError: null },
  12: { status: 'idle', lastError: null },
  13: { status: 'idle', lastError: null },
  14: { status: 'idle', lastError: null },
  15: { status: 'idle', lastError: null }
};

// 命令队列系统，确保串口操作顺序执行
let commandQueue = [];
let isProcessingQueue = false;

// 记录轮子舵机的活动状态
const wheelActive = {
  13: false,
  14: false,
  15: false
};

// 添加一个工具函数来获取关节索引对应的舵机ID（如果使用keyMappings则不需要）
function getServoIdFromJointIndex(jointIndex) {
  return jointIndex + 1; // 简单映射关系，关节索引从0开始，舵机ID从1开始
}

/**
 * 添加舵机分组信息，方便批量操作
 */
const servoGroups = {
  leftArm: [1, 2, 3, 4, 5, 6],
  rightArm: [7, 8, 9, 10, 11, 12],
  wheels: [13, 14, 15],
  all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
};

/**
 * 显示警告提醒
 * @param {string} type - 提醒类型 ('joint' 虚拟关节限位, 'servo' 真实舵机错误)
 * @param {string} message - 显示的消息
 * @param {number} duration - 显示持续时间(毫秒)，默认3秒
 */
function showAlert(type, message, duration = 3000) {
  const alertId = type === 'joint' ? 'jointLimitAlert' : 'servoLimitAlert';
  const alertElement = document.getElementById(alertId);
  
  if (alertElement) {
    // Use translation system for alerts
    let translatedMessage = '';
    
    if (type === 'joint') {
      translatedMessage = t('joint-limit', { name: message.replace('Joint ', '').replace(' has reached its limit!', '') });
    } else if (type === 'servo') {
      translatedMessage = t('servo-limit', { id: message.replace('Servo ', '').replace(' has reached its limit!', '') });
    } else {
      translatedMessage = message;
    }
    
    // 设置消息并显示
    alertElement.textContent = translatedMessage;
    alertElement.style.display = 'block';
    
    // 设置定时器，自动隐藏
    setTimeout(() => {
      alertElement.style.display = 'none';
    }, duration);
  }
}

/**
 * 添加命令到队列并执行
 * @param {Function} commandFn - 一个返回Promise的函数
 * @returns {Promise} 命令执行的Promise
 */
function queueCommand(commandFn) {
  return new Promise((resolve, reject) => {
    // 添加命令到队列
    commandQueue.push({
      execute: commandFn,
      resolve,
      reject
    });
    
    // 如果队列未在处理中，开始处理
    if (!isProcessingQueue) {
      processCommandQueue();
    }
  });
}

/**
 * 处理命令队列
 */
async function processCommandQueue() {
  if (commandQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  const command = commandQueue.shift();
  
  try {
    // 在执行下一个命令前等待一小段时间
    // await new Promise(resolve => setTimeout(resolve, 1));
    const result = await command.execute();
    command.resolve(result);
  } catch (error) {
    command.reject(error);
    console.error('Command execution error:', error);
  }
  
  // 继续处理队列中的下一个命令
  await processCommandQueue();
}

/**
 * 检查关节值是否在URDF定义的限制范围内
 * @param {Object} joint - 关节对象
 * @param {number} newValue - 新的关节值
 * @returns {boolean} 如果在限制范围内则返回true
 */
function isJointWithinLimits(joint, newValue) {
  // 如果关节类型是continuous或类型是fixed，则没有限制
  if (joint.jointType === 'continuous' || joint.jointType === 'fixed') {
    return true;
  }
  
  // 如果关节设置了ignoreLimits标志，也返回true
  if (joint.ignoreLimits) {
    return true;
  }
  
  // 检查关节值是否在上下限范围内
  // 注意：对于多自由度关节，需要检查每个值
  if (Array.isArray(newValue)) {
    // 对于多自由度关节如planar、floating等
    return true; // 这种情况较为复杂，需要根据实际情况处理
  } else {
    // 对于单自由度关节，如revolute或prismatic
    return newValue >= joint.limit.lower && newValue <= joint.limit.upper;
  }
}

// Add configuration object for robot control parameters
const robotConfig = {
  wheelControl: {
    speedFactor: 1500  // Base speed value for wheel servos
  }
};

// Add configuration object for orientation thresholds
const joyconConfig = {
  orientationThresholds: {
    pitch: 30,  // Beta angle threshold (up/down)
    roll: 30    // Gamma angle threshold (left/right)
  },
  stickThresholds: {
    left: 0.3,  // Left stick sensitivity threshold
    right: 0.3  // Right stick sensitivity threshold
  }
};

/**
 * Core robot control functions that can be used by any input method (keyboard, joycon, etc.)
 */
export const robotControl = {
  /**
   * Control a single servo joint movement
   * @param {Object} robot - Robot object
   * @param {number} jointIndex - Joint index
   * @param {number} direction - Movement direction (-1 or 1)
   * @returns {Promise<boolean>} Whether operation was successful
   */
  controlJoint: async function(robot, jointIndex, direction) {
    // Get joint name from index
    const jointName = this.getJointNameByIndex(robot, jointIndex);
    if (!jointName) {
      console.warn(`Invalid joint index: ${jointIndex}`);
      return false;
    }

    // Get current joint value
    const currentValue = robot.joints[jointName].angle;
    
    // Calculate new joint value
    const newValue = currentValue + direction * stepSize;
    
    // Get servo ID (typically jointIndex + 1, but could be different)
    const servoId = getServoIdFromJointIndex(jointIndex);
    
    // Check if exceeding joint limits
    if (!isJointWithinLimits(robot.joints[jointName], newValue)) {
      console.warn(`Joint ${jointName} would exceed its limits. Movement prevented.`);
      // Show virtual joint limit alert
      showAlert('joint', `Joint ${jointName} has reached its limit!`);
      return false;
    }
    
    // If not connected to real robot, just update virtual joint
    if (!isConnectedToRealRobot) {
      robot.joints[jointName].setJointValue(newValue);
      return true;
    }
    
    // Handle real robot control
    const isWheelServo = servoId >= 13 && servoId <= 15;
    
    if (isWheelServo) {
      // Wheel servos use speed control
      // Use speedFactor from config instead of local declaration
      const wheelSpeed = direction * robotConfig.wheelControl.speedFactor;
      
      console.log(`Setting wheel servo ${servoId} speed to ${wheelSpeed}`);
      
      try {
        await writeWheelSpeed(servoId, wheelSpeed);
        robot.joints[jointName].setJointValue(newValue);
        servoCommStatus[servoId].status = 'success';
        updateServoStatusUI();
        return true;
      } catch (error) {
        console.error(`Error controlling wheel servo ${servoId}:`, error);
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = error.message || 'Communication error';
        updateServoStatusUI();
        showAlert('servo', `Wheel servo ${servoId} error: ${error.message || 'Communication failed'}`);
        return false;
      }
    } else {
      // Non-wheel servos use position control
      // Calculate servo position change in servo steps
      const stepChange = Math.round((direction * stepSize) * (4096 / (2 * Math.PI)));
      
      // Calculate new position value
      let newPosition = servoCurrentPositions[servoId] + stepChange;
      
      // Check if the new position is outside the valid range (1-4095)
      if (newPosition < 5 || newPosition > 4090) {
        // Show an alert to inform the user
        showAlert('servo', `Servo ${servoId} position (${newPosition}) exceeds valid range (100-4000). Movement prevented.`);
        console.warn(`Servo ${servoId} position (${newPosition}) exceeds valid range. Movement prevented.`);
        return false;
      }
      
      // Store current position (virtual servo not updated yet)
      const prevPosition = servoCurrentPositions[servoId];
      // Update current position record
      servoCurrentPositions[servoId] = newPosition;
      
      // Update servo status to pending
      servoCommStatus[servoId].status = 'pending';
      updateServoStatusUI();
      
      try {
        // Use queue system to control servo, prevent concurrent access
        await writeServoPosition(servoId, newPosition);
        // Update virtual joint
        robot.joints[jointName].setJointValue(newValue);
        // Update last safe position
        servoLastSafePositions[servoId] = newPosition;
        
        // Update servo status to success
        servoCommStatus[servoId].status = 'success';
        updateServoStatusUI();
        return true;
      } catch (error) {
        // Servo control failed, don't update virtual joint, restore current position
        servoCurrentPositions[servoId] = prevPosition;
        console.error(`Error controlling servo ${servoId}:`, error);
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = error.message || 'Communication error';
        updateServoStatusUI();
        
        // Show servo error alert
        showAlert('servo', `Servo ${servoId} error: ${error.message || 'Communication failed'}`);
        return false;
      }
    }
  },

  /**
   * Stop wheel servo motion
   * @param {number} servoId - Servo ID (13-15)
   * @returns {Promise<boolean>} Whether operation was successful
   */
  stopWheel: async function(servoId) {
    if (!isConnectedToRealRobot || servoId < 13 || servoId > 15) return false;
    
    console.log(`Stopping wheel servo ${servoId}`);
    try {
      await writeWheelSpeed(servoId, 0);
      console.log(`Wheel servo ${servoId} stopped`);
      wheelActive[servoId] = false;
      return true;
    } catch (error) {
      console.error(`Error stopping wheel servo ${servoId}:`, error);
      return false;
    }
  },
  
  /**
   * Stop all wheel servo motion
   * @returns {Promise<boolean>} Whether all operations were successful
   */
  stopAllWheels: async function() {
    if (!isConnectedToRealRobot) return false;
    
    console.log('Stopping all wheel servos');
    const wheelIds = [13, 14, 15];
    
    try {
      // Stop all wheels in parallel
      await Promise.all(wheelIds.map(id => this.stopWheel(id)));
      return true;
    } catch (error) {
      console.error('Error stopping all wheel servos:', error);
      return false;
    }
  },
  
  /**
   * Get joint name from index
   * @param {Object} robot - Robot object
   * @param {number} jointIndex - Joint index
   * @returns {string|null} - Joint name or null if not found
   */
  getJointNameByIndex: function(robot, jointIndex) {
    const jointNames = robot && robot.joints ? 
      Object.keys(robot.joints).filter(name => robot.joints[name].jointType !== 'fixed') : [];
    
    return jointIndex < jointNames.length ? jointNames[jointIndex] : null;
  },
  
  /**
   * Check if servo has an error
   * @param {number} servoId - Servo ID
   * @returns {boolean} - Whether servo has an error
   */
  isServoInErrorState: function(servoId) {
    return servoCommStatus[servoId] && servoCommStatus[servoId].status === 'error';
  },
  
  /**
   * Update robot's matrix world
   * @param {Object} robot - Robot object
   */
  updateRobot: function(robot) {
    if (robot && robot.updateMatrixWorld) {
      robot.updateMatrixWorld(true);
    }
  },

};

// Get initial stepSize from the HTML slider
const speedControl = document.getElementById('speedControl');
let stepSize = speedControl ? MathUtils.degToRad(parseFloat(speedControl.value)) : MathUtils.degToRad(0.2);


/**
 * 设置键盘控制
 * @param {Object} robot - 要控制的机器人对象
 * @returns {Function} 用于在渲染循环中更新关节的函数
 */
export function setupKeyboardControls(robot) {
  const keyState = {};
  // Get the keyboard control section element
  const keyboardControlSection = document.getElementById('keyboardControlSection');
  let keyboardActiveTimeout;

  
  // 默认的按键-关节映射
  const keyMappings = {
    // Left arm controls (using number keys)
    '1': [{ jointIndex: 0, direction: 1, servoId: 1 }],  // Left Rotation +
    'q': [{ jointIndex: 0, direction: -1, servoId: 1 }], // Left Rotation -
    '2': [{ jointIndex: 1, direction: 1, servoId: 2 }],  // Left Pitch +
    'w': [{ jointIndex: 1, direction: -1, servoId: 2 }], // Left Pitch -
    '3': [{ jointIndex: 2, direction: 1, servoId: 3 }],  // Left Elbow +
    'e': [{ jointIndex: 2, direction: -1, servoId: 3 }], // Left Elbow -
    '4': [{ jointIndex: 3, direction: 1, servoId: 4 }],  // Left Wrist Pitch +
    'r': [{ jointIndex: 3, direction: -1, servoId: 4 }], // Left Wrist Pitch -
    '5': [{ jointIndex: 4, direction: 1, servoId: 5 }], // Left Wrist Roll +
    't': [{ jointIndex: 4, direction: -1, servoId: 5 }],// Left Wrist Roll -
    '6': [{ jointIndex: 5, direction: 1, servoId: 6 }], // Left Jaw +
    'y': [{ jointIndex: 5, direction: -1, servoId: 6 }],// Left Jaw -
    
    // Right arm controls (using ASDFGH and ZXCVBN keys)
    'a': [{ jointIndex: 6, direction: 1, servoId: 7 }],  // Right Rotation +
    'z': [{ jointIndex: 6, direction: -1, servoId: 7 }], // Right Rotation -
    's': [{ jointIndex: 7, direction: 1, servoId: 8 }],  // Right Pitch +
    'x': [{ jointIndex: 7, direction: -1, servoId: 8 }], // Right Pitch -
    'd': [{ jointIndex: 8, direction: 1, servoId: 9 }],  // Right Elbow +
    'c': [{ jointIndex: 8, direction: -1, servoId: 9 }], // Right Elbow -
    'f': [{ jointIndex: 9, direction: 1, servoId: 10 }],  // Right Wrist Pitch +
    'v': [{ jointIndex: 9, direction: -1, servoId: 10 }], // Right Wrist Pitch -
    'g': [{ jointIndex: 10, direction: 1, servoId: 11 }],  // Right Wrist Roll +
    'b': [{ jointIndex: 10, direction: -1, servoId: 11 }], // Right Wrist Roll -
    'h': [{ jointIndex: 11, direction: 1, servoId: 12 }],  // Right Jaw +
    'n': [{ jointIndex: 11, direction: -1, servoId: 12 }], // Right Jaw -
    
    // Wheel controls using arrow keys (based on robotConfig.js)
    'arrowup': [
      { jointIndex: 12, direction: -1, servoId: 13 },
      { jointIndex: 14, direction: 1, servoId: 15 }
    ],
    'arrowdown': [
      { jointIndex: 12, direction: 1, servoId: 13 },
      { jointIndex: 14, direction: -1, servoId: 15 }
    ],
    'arrowleft': [
      { jointIndex: 12, direction: 1, servoId: 13 },
      { jointIndex: 13, direction: 1, servoId: 14 },
      { jointIndex: 14, direction: 1, servoId: 15 }
    ],
    'arrowright': [
      { jointIndex: 12, direction: -1, servoId: 13 },
      { jointIndex: 13, direction: -1, servoId: 14 }, 
      { jointIndex: 14, direction: -1, servoId: 15 }
    ],
  };
  
  // Function to set the div as active
  const setKeyboardSectionActive = () => {
    if (keyboardControlSection) {
      keyboardControlSection.classList.add('control-active');
      
      // Clear existing timeout if any
      if (keyboardActiveTimeout) {
        clearTimeout(keyboardActiveTimeout);
      }
      
      // Set timeout to remove the active class after 1 seconds of inactivity
      keyboardActiveTimeout = setTimeout(() => {
        keyboardControlSection.classList.remove('control-active');
      }, 1000);
    }
  };
  
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    console.log('Key pressed:', key);
    
    // 如果是新按下的键，检查是否需要处理
    const isKeyChange = !keyState[key];
    keyState[key] = true;
    
    // Add visual styling to show pressed key
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
      keyElement.classList.add('key-pressed');
      
      // Highlight the keyboard control section
      setKeyboardSectionActive();
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    const wasKeyPressed = keyState[key];
    keyState[key] = false;
    
    console.log('Key released:', key);
    
    // Remove visual styling when key is released
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
      keyElement.classList.remove('key-pressed');
    }
    
    // 如果释放的是方向键，停止对应的轮子舵机
    if (wasKeyPressed && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      stopWheelsForKey(key);
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

  /**
   * 停止与指定按键相关的轮子舵机
   * @param {string} key - 释放的按键
   */
  function stopWheelsForKey(key) {
    if (!isConnectedToRealRobot) return;
    
    console.log(`Processing wheel stop for key: ${key}`);
    
    // 检查按键映射中是否包含该键
    if (keyMappings[key] && Array.isArray(keyMappings[key])) {
      // 获取该键对应的所有舵机ID
      const servoIds = keyMappings[key].map(mapping => mapping.servoId);
      
      // 检查当前是否有其他方向键被按下
      const otherKeysPressed = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright']
        .filter(k => k !== key && keyState[k]);
      
      console.log(`Other direction keys pressed: ${otherKeysPressed.join(', ') || 'none'}`);
      
      // 对于每个舵机，检查是否需要停止
      servoIds.forEach(servoId => {
        if (servoId >= 13 && servoId <= 15) {
          // 检查其他按下的键是否也控制这个舵机
          let shouldStop = true;
          
          // 检查其他按键是否控制这个舵机
          for (const otherKey of otherKeysPressed) {
            if (Array.isArray(keyMappings[otherKey])) {
              const controlsThisServo = keyMappings[otherKey].some(m => m.servoId === servoId);
              if (controlsThisServo) {
                shouldStop = false;
                console.log(`Servo ${servoId} still controlled by ${otherKey}, not stopping`);
                break;
              }
            }
          }
          
          // 如果需要停止，发送停止命令
          if (shouldStop) {
            console.log(`Stopping wheel servo ${servoId} (key ${key} released)`);
            robotControl.stopWheel(servoId);
          }
        }
      });
    }
  }

  function updateJoints() {
    if (!robot || !robot.joints) return;

    let keyPressed = false;

    // 处理每个按键映射
    Object.keys(keyState).forEach(key => {
      if (keyState[key] && keyMappings[key]) {
        keyPressed = true;
        
        // Process all mappings for this key (now all are arrays)
        keyMappings[key].forEach(mapping => {
          const { jointIndex, direction, servoId } = mapping;
          
          // 检查关节是否存在于机器人中
          if (isConnectedToRealRobot && servoCommStatus[servoId].status === 'error') {
            console.warn(`Servo ${servoId} is in error state. Virtual movement prevented.`);
            return; // 跳过这个关节的更新
          }
          
          // 使用通用舵机控制函数
          robotControl.controlJoint(robot, jointIndex, direction);
        });
      }
    });

    // If any key is pressed, set the keyboard section as active
    if (keyPressed) {
      setKeyboardSectionActive();
    }

    // 更新机器人
    robotControl.updateRobot(robot);
  }

  
  // 返回更新函数，以便可以在渲染循环中调用
  return updateJoints;
}

export function setupJoyconControls(robot) {
  // 扁平化 joyconState，直接记录按钮状态
  const joyconState = {
    // 按钮状态
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    x: false,
    y: false,
    l: false,
    zl: false,
    r: false,
    zr: false,
    plus: false,
    minus: false,
    // 右摇杆
    home: false,
    capture: false,
    // 新增 SR/SL 按钮状态
    leftSl: false,
    leftSr: false,
    rightSl: false,
    rightSr: false,

    leftStickRight: false,
    leftStickLeft: false,
    leftStickUp: false,
    leftStickDown: false,
    rightStickRight: false,
    rightStickLeft: false,
    rightStickUp: false,
    rightStickDown: false,
    
    // Replace old orientation flags with better names
    leftPitchUp: false,    // was leftOrientationBetaGreaterThan45
    leftPitchDown: false,  // was leftOrientationBetaLessThanMinus45
    leftRollRight: false,  // was leftOrientationGammaGreaterThan45
    leftRollLeft: false,   // was leftOrientationGammaLessThanMinus45
    
    rightPitchUp: false,   // was rightOrientationBetaGreaterThan45
    rightPitchDown: false, // was rightOrientationBetaLessThanMinus45
    rightRollRight: false, // was rightOrientationGammaGreaterThan45
    rightRollLeft: false,  // was rightOrientationGammaLessThanMinus45
    
    // 扁平化摇杆数据 - 直接作为按钮状态
    leftStickRight: false,
    leftStickLeft: false,
    leftStickUp: false, 
    leftStickDown: false,
    rightStickRight: false,
    rightStickLeft: false,
    rightStickUp: false,
    rightStickDown: false,
    
    // 记录哪些控制器已连接
    leftConnected: false,
    rightConnected: false
  };

  const buttonMapping = {
    'rightStickRight': [{ jointIndex: 0, direction: 1 }], // Base rotation right
    'rightStickLeft': [{ jointIndex: 0, direction: -1 }], // Base rotation left
    'rightStickUp': [{ jointIndex: 2, direction: -1 }], // Right shoulder up
    'rightStickDown': [{ jointIndex: 2, direction: 1 }], // Right shoulder down
    'x': [{ jointIndex: 1, direction: 1 }],
    'b': [{ jointIndex: 1, direction: -1 }],
    'r': [{jointIndex: 5, direction: 1}],
    'zr': [{jointIndex: 5, direction: -1}],
    'rightPitchUp': [{jointIndex: 3, direction: -1}],
    'rightPitchDown': [{jointIndex: 3, direction: 1}],
    'rightRollRight': [{jointIndex: 4, direction: -1}],
    'rightRollLeft': [{jointIndex: 4, direction: 1}],


    'leftStickRight': [{ jointIndex: 6, direction: 1 }], // Left shoulder right
    'leftStickLeft': [{ jointIndex: 6, direction: -1 }], // Left shoulder left
    'leftStickUp': [{ jointIndex: 8, direction: -1 }],
    'leftStickDown': [{ jointIndex: 8, direction: 1 }],
    'up': [{ jointIndex: 7, direction: 1 }],
    'down': [{ jointIndex: 7, direction: -1 }],
    'l': [{jointIndex: 11, direction: 1}],
    'zl': [{jointIndex: 11, direction: -1}],
    'leftPitchUp': [{jointIndex: 9, direction: -1}],
    'leftPitchDown': [{jointIndex: 9, direction: 1}],
    'leftRollRight': [{jointIndex: 10, direction: -1}],
    'leftRollLeft': [{jointIndex: 10, direction: 1}],

    // 更新按键映射，使用右 SR/SL 代替 plus/minus
    'rightSr': [
      { jointIndex: 12, direction: 1 }, // Left wheel forward
      { jointIndex: 14, direction: -1 } // Right wheel forward
    ],
    'rightSl': [
      { jointIndex: 12, direction: -1 }, // Left wheel backward
      { jointIndex: 14, direction: 1 } // Right wheel backward
    ],
    // 更新按键映射，使用左 SR/SL 代替 y/a
    'leftSr': [
      { jointIndex: 12, direction: 1, servoId: 13 },
      { jointIndex: 13, direction: 1, servoId: 14 },
      { jointIndex: 14, direction: 1, servoId: 15 }
    ], // 左转 - 所有轮子正向
    'leftSl': [
      { jointIndex: 12, direction: -1, servoId: 13 },
      { jointIndex: 13, direction: -1, servoId: 14 },
      { jointIndex: 14, direction: -1, servoId: 15 }
    ], // 右转 - 所有轮子反向
  }

  const connectLeftButton = document.getElementById('connectLeftJoycon');
  const connectRightButton = document.getElementById('connectRightJoycon');  
  connectLeftButton.addEventListener('click', connectJoyCon);
  connectRightButton.addEventListener('click', connectJoyCon);

  console.log('connectedJoyCons in setupJoyconControls', connectedJoyCons);

  const leftJoycon = document.getElementById('joycon-l');
  const rightJoycon = document.getElementById('joycon-r');
  // Function to update UI based on connected joycons
  function updateJoyconDisplay() {
    const joyconHelpIcon = document.getElementById('joyconHelpIcon');
    let anyJoyconConnected = false;
    
    for (const joyCon of connectedJoyCons.values()) {
      if (joyCon instanceof JoyConLeft) {
        // Hide button and show joycon figure
        connectLeftButton.style.display = 'none';
        if (leftJoycon) leftJoycon.style.display = 'inline-block';
        anyJoyconConnected = true;
      } else if (joyCon instanceof JoyConRight) {
        // Hide button and show joycon figure
        connectRightButton.style.display = 'none';
        if (rightJoycon) rightJoycon.style.display = 'inline-block';
        anyJoyconConnected = true;
      }
    }
    
    // Show help icon when any Joycon is connected
    if (joyconHelpIcon) {
      joyconHelpIcon.style.display = anyJoyconConnected ? 'inline-flex' : 'none';
    }
  }

  const rootStyle = document.documentElement.style;
  // Visualize function to handle joycon inputs
  function visualize(joyConSide, buttons, orientation, joystick) {
    if (joyConSide === 'left') {
      // rootStyle.setProperty('--left-alpha', `${orientation.alpha}deg`);
      rootStyle.setProperty('--left-beta', `${orientation.beta}deg`);
      rootStyle.setProperty('--left-gamma', `${orientation.gamma}deg`);
    } else if (joyConSide === 'right') {
      // rootStyle.setProperty('--right-alpha', `${orientation.alpha}deg`);
      rootStyle.setProperty('--right-beta', `${orientation.beta}deg`);
      rootStyle.setProperty('--right-gamma', `${orientation.gamma}deg`);
    }
  
    if (joyConSide === 'left') {
      const joystickMultiplier = 10;
      document.querySelector('#joystick-left').style.transform = `translateX(${
        joystick.horizontal * joystickMultiplier
      }px) translateY(${joystick.vertical * joystickMultiplier}px)`;
  
      document.querySelector('#up').classList.toggle('highlight', buttons.up);
      document.querySelector('#down').classList.toggle('highlight', buttons.down);
      document.querySelector('#left').classList.toggle('highlight', buttons.left);
      document
        .querySelector('#right')
        .classList.toggle('highlight', buttons.right);
      document
        .querySelector('#capture')
        .classList.toggle('highlight', buttons.capture);
      document
        .querySelector('#l')
        .classList.toggle('highlight', buttons.l || buttons.zl);
      document
        .querySelector('#minus')
        .classList.toggle('highlight', buttons.minus);
      document
        .querySelector('#joystick-left')
        .classList.toggle('highlight', buttons.leftStick);
    }
    if (joyConSide === 'right') {
      const joystickMultiplier = 10;
      document.querySelector('#joystick-right').style.transform = `translateX(${
        joystick.horizontal * joystickMultiplier
      }px) translateY(${joystick.vertical * joystickMultiplier}px)`;
  
      document.querySelector('#a').classList.toggle('highlight', buttons.a);
      document.querySelector('#b').classList.toggle('highlight', buttons.b);
      document.querySelector('#x').classList.toggle('highlight', buttons.x);
      document.querySelector('#y').classList.toggle('highlight', buttons.y);
      document.querySelector('#home').classList.toggle('highlight', buttons.home);
      document
        .querySelector('#r')
        .classList.toggle('highlight', buttons.r || buttons.zr);
      document.querySelector('#plus').classList.toggle('highlight', buttons.plus);
      document
        .querySelector('#joystick-right')
        .classList.toggle('highlight', buttons.rightStick);
    }
  }

  // 添加按钮状态跟踪对象，用于检测按钮首次按下
  const previousPlusMinusButtonState = {
    plus: false,
    minus: false
  };

  /**
   * 更新控制速度
   * @param {string} direction - 速度调整方向 ('increase' 或 'decrease')
   */
  function updateControlSpeed(direction) {
    const speedControl = document.getElementById('speedControl');
    const speedDisplay = document.getElementById('speedValue');
    
    if (speedControl && speedDisplay) {
      let currentSpeed = parseFloat(speedControl.value);
      const speedStep = 0.1;
      
      if (direction === 'increase') {
        // 增加速度
        currentSpeed = Math.min(1.0, currentSpeed + speedStep);
        console.log('Speed increased to:', currentSpeed.toFixed(1));
      } else if (direction === 'decrease') {
        // 减小速度
        currentSpeed = Math.max(0.1, currentSpeed - speedStep);
        console.log('Speed decreased to:', currentSpeed.toFixed(1));
      }
      
      // 更新UI和系统中的速度值
      speedControl.value = currentSpeed.toFixed(1);
      speedDisplay.textContent = currentSpeed.toFixed(1);
      stepSize = MathUtils.degToRad(currentSpeed);
    }
  }

  setInterval(async () => {
    // Update UI based on connected joycons
    updateJoyconDisplay();
    
    for (const joyCon of connectedJoyCons.values()) {
      if (joyCon.eventListenerAttached) {
        continue;
      }
      joyCon.eventListenerAttached = true;
      // await joyCon.enableVibration();
      joyCon.addEventListener('hidinput', (event) => {
        const packet = event.detail;
        if (!packet || !packet.actualOrientation) {
          return;
        }
        const {
          buttonStatus: buttons,
          actualOrientation: orientation,
          analogStickLeft: analogStickLeft,
          analogStickRight: analogStickRight,
        } = packet;

        // update joyconState with flattened structure
        if (joyCon instanceof JoyConLeft) {
          // Update orientation checks with configurable thresholds
          joyconState.leftPitchUp = orientation.beta > joyconConfig.orientationThresholds.pitch;
          joyconState.leftPitchDown = orientation.beta < -joyconConfig.orientationThresholds.pitch;
          joyconState.leftRollRight = orientation.gamma > joyconConfig.orientationThresholds.roll;
          joyconState.leftRollLeft = orientation.gamma < -joyconConfig.orientationThresholds.roll;
          joyconState.leftConnected = true;
          
          // Update buttons from left Joy-Con
          joyconState.up = buttons.up;
          joyconState.down = buttons.down;
          joyconState.left = buttons.left;
          joyconState.right = buttons.right;
          joyconState.l = buttons.l;
          joyconState.zl = buttons.zl;
          joyconState.minus = buttons.minus;
          joyconState.capture = buttons.capture;
          // 更新左 Joy-Con 的 SR/SL 按钮状态
          joyconState.leftSl = buttons.sl;
          joyconState.leftSr = buttons.sr;
          joyconState.leftStickRight = analogStickLeft.horizontal > joyconConfig.stickThresholds.left;
          joyconState.leftStickLeft = analogStickLeft.horizontal < -joyconConfig.stickThresholds.left;
          joyconState.leftStickUp = analogStickLeft.vertical > joyconConfig.stickThresholds.left;
          joyconState.leftStickDown = analogStickLeft.vertical < -joyconConfig.stickThresholds.left;
          
          visualize('left', buttons, orientation, analogStickLeft);
          
          // 处理左侧minus键控制速度
          if (buttons.minus && !previousPlusMinusButtonState.minus) {
            // 只在按钮状态由未按下变为按下时执行
            updateControlSpeed('decrease');
          }
          // 更新按钮状态跟踪
          previousPlusMinusButtonState.minus = buttons.minus;
          
        } else if (joyCon instanceof JoyConRight) {
          // Update orientation checks with configurable thresholds
          joyconState.rightPitchUp = orientation.beta > joyconConfig.orientationThresholds.pitch;
          joyconState.rightPitchDown = orientation.beta < -joyconConfig.orientationThresholds.pitch;
          joyconState.rightRollRight = orientation.gamma > joyconConfig.orientationThresholds.roll;
          joyconState.rightRollLeft = orientation.gamma < -joyconConfig.orientationThresholds.roll;
          joyconState.rightConnected = true;
          // Update buttons from right Joy-Con
          joyconState.a = buttons.a;
          joyconState.b = buttons.b;
          joyconState.x = buttons.x;
          joyconState.y = buttons.y;
          joyconState.r = buttons.r;
          joyconState.zr = buttons.zr;
          joyconState.plus = buttons.plus;
          joyconState.home = buttons.home;
          // 更新右 Joy-Con 的 SR/SL 按钮状态
          joyconState.rightSl = buttons.sl;
          joyconState.rightSr = buttons.sr;
          joyconState.rightStickRight = analogStickRight.horizontal > joyconConfig.stickThresholds.right;
          joyconState.rightStickLeft = analogStickRight.horizontal < -joyconConfig.stickThresholds.right;
          joyconState.rightStickUp = analogStickRight.vertical > joyconConfig.stickThresholds.right;
          joyconState.rightStickDown = analogStickRight.vertical < -joyconConfig.stickThresholds.right;
          
          visualize('right', buttons, orientation, analogStickRight);
          
          // 处理右侧plus键控制速度
          if (buttons.plus && !previousPlusMinusButtonState.plus) {
            // 只在按钮状态由未按下变为按下时执行
            updateControlSpeed('increase');
          }
          // 更新按钮状态跟踪
          previousPlusMinusButtonState.plus = buttons.plus;
        }
      });
    }
  }, 2000);

  function updateJoints() {
    if (!robot || !robot.joints || !joyconState) return;
    
    // Check if any Joy-Con is connected
    if (!joyconState.leftConnected && !joyconState.rightConnected) return;

    // Process all button mappings directly
    Object.keys(buttonMapping).forEach(button => {
      if (joyconState[button]) {
        buttonMapping[button].forEach(mapping => {
          const { jointIndex, direction } = mapping;
          robotControl.controlJoint(robot, jointIndex, direction);
        });
      }
    });
    
    // Update robot's matrix world
    robotControl.updateRobot(robot);
  }
  return updateJoints;
}

/**
 * 设置控制面板UI
 */
export function setupControlPanel() {
  // Initialize language system
  initLanguageSystem();
  
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

  // 添加真实机器人连接事件处理 - 所有舵机
  const connectButton = document.getElementById('connectRealRobotBtn');
  if (connectButton) {
    connectButton.addEventListener('click', () => toggleRealRobotConnection(servoGroups.all));
  }
}

/**
 * 设置可折叠部分的功能
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
 * 通用舵机错误处理函数
 * @param {number} servoId - 舵机ID (1-6)
 * @param {number} result - 通信结果代码
 * @param {number} error - 错误代码
 * @param {string} operation - 操作类型描述（如'read'、'position'等）
 * @param {boolean} isWarning - 是否作为警告处理（而非错误）
 * @returns {boolean} 操作是否成功
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
  const statusPrefix = isWarning ? '' : (result !== COMM_SUCCESS ? 'Communication failed: ' : '');
  
  let errorMessage = '';
  
  // 检查错误码
  if (error & ERRBIT_OVERLOAD) {
    errorMessage = `${statusPrefix}Overload or stuck${!isWarning ? ` (code: ${result})` : ''}`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with overload error (${error})`);
  } else if (error & ERRBIT_OVERHEAT) {
    errorMessage = `${statusPrefix}Overheat${!isWarning ? ` (code: ${result})` : ''}`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with overheat error (${error})`);
  } else if (error & ERRBIT_VOLTAGE) {
    errorMessage = `${statusPrefix}Voltage error${!isWarning ? ` (code: ${result})` : ''}`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with voltage error (${error})`);
  } else if (error & ERRBIT_ANGLE) {
    errorMessage = `${statusPrefix}Angle sensor error${!isWarning ? ` (code: ${result})` : ''}`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with angle sensor error (${error})`);
  } else if (error & ERRBIT_OVERELE) {
    errorMessage = `${statusPrefix}Overcurrent${!isWarning ? ` (code: ${result})` : ''}`;
    servoCommStatus[servoId].lastError = errorMessage;
    const logFn = isWarning ? console.warn : console.error;
    logFn(`Servo ${servoId} ${operation} ${isWarning ? 'warning' : 'failed'} with overcurrent error (${error})`);
  } else if (error !== 0 || result !== COMM_SUCCESS) {
    errorMessage = `${statusPrefix}${isWarning ? 'Unknown error code' : operation + ' failed'}: ${error}${!isWarning ? ` (code: ${result})` : ''}`;
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
  
  updateServoStatusUI();
  return false;
}

// 添加真实机器人操作相关的函数
/**
 * 切换真实机器人连接状态
 * @param {Array} [targetServos] - 可选参数，指定要连接的舵机ID数组，不提供则连接所有舵机
 */
async function toggleRealRobotConnection(targetServos) {
  const connectButton = document.getElementById('connectRealRobotBtn');
  const servoStatusContainer = document.getElementById('servoStatusContainer');
  
  if (!connectButton) return;
  
  // 如果未指定目标舵机，则默认连接所有舵机
  if (!targetServos) {
    targetServos = servoGroups.all; // 使用所有舵机
  }
  
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
      
      // 重置目标舵机状态为idle
      targetServos.forEach(servoId => {
        servoCommStatus[servoId] = { status: 'idle', lastError: null };
      });
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
      for (const servoId of targetServos) {
        try {
          // 更新舵机状态为处理中
          servoCommStatus[servoId].status = 'pending';
          updateServoStatusUI();
          
          // 先启用扭矩 - 集中一次性处理
          await writeTorqueEnable(servoId, 1);
          
          // 区分轮子舵机和非轮子舵机的初始化
          if (servoId >= 13 && servoId <= 15) {
            // 轮子舵机设置为轮模式（连续旋转模式）
            console.log('set wheel mode');
            const wheelModeSuccess = await setWheelMode(servoId);
            console.log('after set wheel mode', wheelModeSuccess);
            if (!wheelModeSuccess) {
              console.warn(`Failed to set wheel mode for servo ${servoId}`);
            }
            
            // 设置轮子初始速度为0（停止状态）
            await writeWheelSpeed(servoId, 0);
            
            servoCommStatus[servoId].status = 'success';
            console.log(`Wheel servo ${servoId} initialized in wheel mode`);
          } else {
            // 非轮子舵机使用常规初始化
            // 按顺序执行，等待每个操作完成
            await writeServoAcceleration(servoId, 10);
            await writeServoSpeed(servoId, 300);
            
            // 读取当前位置并保存
            // TODO: 需要读取吗？目前的回到没错位置功能是坏的
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
      
      // 连接失败，更新目标舵机状态为error
      targetServos.forEach(servoId => {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = error.message || 'Connection failed';
      });
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
        // 先停止所有轮子舵机，防止断开连接后继续运动
        const wheelServos = targetServos.filter(id => id >= 13 && id <= 15);
        for (const wheelId of wheelServos) {
          try {
            // 停止轮子转动
            await writeWheelSpeed(wheelId, 0);
            console.log(`Stopped wheel servo ${wheelId} before disconnecting`);
          } catch (err) {
            console.warn(`Error stopping wheel servo ${wheelId}:`, err);
          }
        }
        
        // Turn off torque before closing
        for (const servoId of targetServos) {
          try {
            await writeTorqueEnable(servoId, 0);
          } catch (err) {
            console.warn(`Error disabling torque for servo ${servoId}:`, err);
          }
        }
        
        await portHandler.closePort();
      }
      
      // 重置目标舵机状态和位置信息
      targetServos.forEach(servoId => {
        servoCommStatus[servoId] = { status: 'idle', lastError: null };
        servoCurrentPositions[servoId] = 0;
        servoLastSafePositions[servoId] = 0;
      });
      
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
 * 读取舵机当前位置
 * @param {number} servoId - 舵机ID (1-6)
 * @returns {number|null} 当前位置值 (0-4095)或失败时返回null
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
      // 读取位置的低字节 (地址56)
      const [lowByte, resultLow, errorLow] = await packetHandler.read1ByteTxRx(
        portHandler,
        servoId,
        ADDR_SCS_PRESENT_POSITION
      );
      
      // 读取位置的高字节 (地址57)
      const [highByte, resultHigh, errorHigh] = await packetHandler.read1ByteTxRx(
        portHandler,
        servoId,
        ADDR_SCS_PRESENT_POSITION + 1
      );
      
      // 检查两次读取是否都成功
      if (!handleServoError(servoId, resultLow, errorLow, 'position reading (low byte)') || 
          !handleServoError(servoId, resultHigh, errorHigh, 'position reading (high byte)')) {
        return null;
      }
      
      // 组合高低字节为一个16位数值
      const position = (highByte << 8) | lowByte;
      
      // console.log('readServoPosition', servoId, position);
      
      // 输出调试信息
      // console.log(`Servo ${servoId} position: 0x${position.toString(16)} (${position})`);
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
 * 写入舵机位置
 * @param {number} servoId - 舵机ID (1-6)
 * @param {number} position - 位置值 (0-4095)
 * @param {boolean} [skipLimitCheck=false] - 是否为恢复操作，已不再检查虚拟关节限制
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
      
      // 将位置值拆分为两个字节，分别写入地址42和43
      // 获取位置值的低8位和高8位
      const lowByte = position & 0xFF;  // 低8位
      const highByte = (position >> 8) & 0xFF;  // 高8位
      
      // console.log(`writeServoPosition: servoId=${servoId}, position=${position}, lowByte=0x${lowByte.toString(16)}, highByte=0x${highByte.toString(16)}`);

      // 先写入低字节到地址42
      const [resultLow, errorLow] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_POSITION, // 42
        lowByte
      );
      
      // 再写入高字节到地址43
      const [resultHigh, errorHigh] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_POSITION + 1, // 43
        highByte
      );
      
      // 合并两次写入的结果
      const result = (resultLow === COMM_SUCCESS && resultHigh === COMM_SUCCESS) ? COMM_SUCCESS : -2; // -2 is COMM_TX_FAIL
      const error = errorLow || errorHigh;
      
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
 * 设置舵机加速度
 * @param {number} servoId - 舵机ID (1-6)
 * @param {number} acceleration - 加速度值 (0-254)
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
 * 设置舵机速度
 * @param {number} servoId - 舵机ID (1-6)
 * @param {number} speed - 速度值 (0-2000)
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
 * 设置舵机扭矩开关
 * @param {number} servoId - 舵机ID (1-6)
 * @param {number} enable - 0: 关闭, 1: 开启
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
 * 更新舵机通信状态UI
 */
function updateServoStatusUI() {
  // For each servo, update its status display
  for (let id = 1; id <= 15; id++) {
    const statusElement = document.getElementById(`servo-${id}-status`);
    const errorElement = document.getElementById(`servo-${id}-error`);
    
    if (statusElement) {
      // Map servo IDs 1-6 to left arm and 7-12 to right arm 
      // Display appropriate status
      if (servoCommStatus[id]) {
        // Show position value alongside status if connected
        if (isConnectedToRealRobot && servoCommStatus[id].status !== 'error') {
          const position = servoCurrentPositions[id] || 0;
          statusElement.textContent = `${servoCommStatus[id].status} (pos: ${position})`;
        } else {
          statusElement.textContent = servoCommStatus[id].status;
        }
        
        // Add visual styling based on status
        statusElement.className = 'servo-status';
        if (servoCommStatus[id].status === 'error') {
          statusElement.classList.add('warning');
        }
        
        // Handle error message display
        if (errorElement) {
          if (servoCommStatus[id].lastError) {
            errorElement.textContent = servoCommStatus[id].lastError;
            errorElement.style.display = 'block';
          } else {
            errorElement.style.display = 'none';
          }
        }
      }
    }
  }
}

/**
 * 写入轮子舵机的速度（区别于位置控制）
 * @param {number} servoId - 舵机ID (13-15)
 * @param {number} speed - 速度值 (-2000 to 2000)，负值表示反向
 * @returns {Promise<boolean>} 操作是否成功
 */
async function writeWheelSpeed(servoId, speed) {
  if (!isConnectedToRealRobot || !portHandler || !packetHandler) return false;
  
  // console.log('writeWheelSpeed!!', speed);

  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      servoCommStatus[servoId].status = 'pending';
      servoCommStatus[servoId].lastError = null;
      updateServoStatusUI();
      
      // 将速度限制在有效范围内并处理方向
      // 注意：速度为0是停止，正负值表示不同方向
      const absSpeed = Math.min(Math.abs(speed), 2500);
      console.log('absSpeed', absSpeed);

      // 舵机速度控制有两个部分：方向位和速度值
      // Feetech舵机的速度寄存器使用bit 15作为方向位(0为正向，1为反向)
      let speedValue = absSpeed & 0x7FFF; // 只取低15位作为速度值
      if (speed < 0) {
        // 设置方向位，添加反向标记
        speedValue |= 0x8000; // 设置第15位为1表示反向
      }
      
      console.log(`Setting wheel servo ${servoId} speed to ${speed > 0 ? '+' : ''}${speed} (raw: 0x${speedValue.toString(16)})`);
      // Important: write2ByteTxRx 有问题，这里用两个1Byte的寄存器来写
      // 获取 speedValue 的低 8 位
      const lowByte = speedValue & 0xFF;
      // 获取 speedValue 的高 8 位
      const highByte = (speedValue & 0xFF00) >> 8;

      const [result, error] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_SPEED, 
        lowByte
      );

      const [result1, error1] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        47,
        highByte
      );

      // console.log('writeWheelSpeed result', result, error, result1, error1);
      
      // 使用通用错误处理函数
      return handleServoError(servoId, result, error, 'wheel speed control');
    } catch (error) {
      console.error(`Error writing wheel speed to servo ${servoId}:`, error);
      servoCommStatus[servoId].status = 'error';
      servoCommStatus[servoId].lastError = error.message || 'Communication error';
      updateServoStatusUI();
      throw error;
    }
  });
}

/**
 * 为轮子舵机设置轮模式（连续旋转模式）
 * @param {number} servoId - 舵机ID (13-15)
 * @returns {Promise<boolean>} 操作是否成功
 */
async function setWheelMode(servoId) {
  if (!portHandler || !packetHandler) return false;
  try {
    console.log(`Setting servo ${servoId} to wheel mode`);
    
    // 定义控制寄存器地址
    const ADDR_SCS_MODE = 33;  // 运行模式地址
    const ADDR_SCS_LOCK = 55;  // 锁定地址
    
    // 解锁舵机配置
    let [result1, error1] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      0  // 0 = 解锁
    );
    
    // 设置为速度模式 (Mode = 1)
    let [result2, error2] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_MODE,
      1  // 1 = 速度模式/轮模式
    );
    
    // 锁定配置，防止意外更改
    let [result3, error3] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      1  // 1 = 锁定
    );
    

    console.log('set wheelMode errors:', error1, error2, error3);

    // 检查是否设置成功
    const success = (result1 === COMM_SUCCESS && result2 === COMM_SUCCESS && result3 === COMM_SUCCESS);
    
    if (success) {
      console.log(`Successfully set servo ${servoId} to wheel mode`);
    } else {
      console.error(`Failed to set servo ${servoId} to wheel mode`, error1, error2, error3);
    }
    
    return success;
  } catch (error) {
    console.error(`Error setting wheel mode for servo ${servoId}:`, error);
    return false;
  }

}