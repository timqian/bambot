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

// Servo control variables
let portHandler = null;
let packetHandler = null;
let isConnectedToRealRobot = false;

// 存储真实舵机的当前位置
let servoCurrentPositions = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0
};

// 存储真实舵机的最后一个安全位置
let servoLastSafePositions = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0
};

// 舵机通信状态
let servoCommStatus = {
  1: { status: 'idle', lastError: null },
  2: { status: 'idle', lastError: null },
  3: { status: 'idle', lastError: null },
  4: { status: 'idle', lastError: null },
  5: { status: 'idle', lastError: null },
  6: { status: 'idle', lastError: null },
};

// 命令队列系统，确保串口操作顺序执行
let commandQueue = [];
let isProcessingQueue = false;

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
    // 设置消息并显示
    alertElement.textContent = message;
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
    await new Promise(resolve => setTimeout(resolve, 5));
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

  // Get initial stepSize from the HTML slider
  const speedControl = document.getElementById('speedControl');
  let stepSize = speedControl ? MathUtils.degToRad(parseFloat(speedControl.value)) : MathUtils.degToRad(0.2);
  
  // 默认的按键-关节映射
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
  
  // 获取机器人实际的关节名称
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
      
      // Set timeout to remove the active class after 2 seconds of inactivity
      keyboardActiveTimeout = setTimeout(() => {
        keyboardControlSection.classList.remove('control-active');
      }, 2000);
    }
  };
  
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
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
    keyState[key] = false;
    
    // Remove visual styling when key is released
    const keyElement = document.querySelector(`.key[data-key="${key}"]`);
    if (keyElement) {
      keyElement.classList.remove('key-pressed');
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

    // 处理每个按键映射
    Object.keys(keyState).forEach(key => {
      if (keyState[key] && keyMappings[key]) {
        keyPressed = true;
        const { jointIndex, direction } = keyMappings[key];
        
        // 根据索引获取关节名称（如果可用）
        if (jointIndex < jointNames.length) {
          const jointName = jointNames[jointIndex];
          
          // 检查关节是否存在于机器人中
          if (robot.joints[jointName]) {
            // 如果连接到真实机器人，先检查该舵机是否有错误状态
            const servoId = jointIndex + 1;
            if (isConnectedToRealRobot && servoCommStatus[servoId].status === 'error') {
              console.warn(`Servo ${servoId} is in error state. Virtual movement prevented.`);
              return; // 跳过这个关节的更新
            }
            
            // 获取当前关节值
            const currentValue = robot.joints[jointName].angle;
            // 计算新的关节值
            const newValue = currentValue + direction * stepSize;
            
            // 检查是否超出关节限制
            if (!isJointWithinLimits(robot.joints[jointName], newValue)) {
              console.warn(`Joint ${jointName} would exceed its limits. Movement prevented.`);
              // 显示虚拟关节限位提醒
              showAlert('joint', `Joint ${jointName} has reached its limit!`);
              return; // 跳过这个关节的更新
            }
            
            // 如果连接到真实机器人，同时控制真实舵机
            if (isConnectedToRealRobot) {
              // 注意: 真实舵机ID从1到6，而jointIndex从0到5
              
              // 计算舵机相对位移量 (角度变化量转换为舵机步数)
              // 大约4096步对应一圈(2π)
              const stepChange = Math.round((direction * stepSize) * (4096 / (2 * Math.PI)));
              
              // 计算新的位置值
              let newPosition = (servoCurrentPositions[servoId] + stepChange) % 4096;
              // if (newPosition < 0) newPosition += 4096; // 处理负数情况
              
              // 重要说明：虚拟关节与真实舵机使用不同的位置和限制系统
              // 虚拟关节使用弧度制，受URDF中定义的限制约束
              // 真实舵机使用0-4095的步数范围，没有应用虚拟关节的限制
              
              // 暂存舵机位置（虚拟舵机还没更新）
              const prevPosition = servoCurrentPositions[servoId];
              // 更新当前位置记录
              servoCurrentPositions[servoId] = newPosition;
              
              // 更新舵机状态为待处理
              servoCommStatus[servoId].status = 'pending';
              updateServoStatusUI();
              
              // 使用队列系统控制舵机，防止并发访问
              // 等待舵机移动结果，决定是否更新虚拟关节
              writeServoPosition(servoId, newPosition)
                .then(success => {
                  // 如果舵机移动成功，更新最后成功位置并设置虚拟关节位置
                  if (success) {
                    // 更新虚拟关节
                    robot.joints[jointName].setJointValue(newValue);
                    // 更新最后安全位置
                    servoLastSafePositions[servoId] = newPosition;

                    // 更新舵机状态为成功
                    servoCommStatus[servoId].status = 'success';
                    updateServoStatusUI();
                  } else {
                    // 如果舵机移动失败，恢复当前位置记录
                    servoCurrentPositions[servoId] = prevPosition;
                    console.warn(`Failed to move servo ${servoId}. Virtual joint not updated.`);
                    
                    // 显示舵机错误提醒
                    showAlert('servo', `Servo ${servoId} movement failed!`);
                    
                    // 尝试将舵机恢复到最后一个安全位置
                    if (servoLastSafePositions[servoId] !== prevPosition) {
                      console.log(`Attempting to move servo ${servoId} back to last safe position...`);
                      writeServoPosition(servoId, servoLastSafePositions[servoId], true)
                        .then(recoverySuccess => {
                          if (recoverySuccess) {
                            console.log(`Successfully moved servo ${servoId} back to safe position.`);
                            servoCurrentPositions[servoId] = servoLastSafePositions[servoId];
                          } else {
                            console.error(`Failed to move servo ${servoId} back to safe position.`);
                            // 显示舵机恢复错误提醒
                            showAlert('servo', `Servo ${servoId} could not recover to safe position!`, 4000);
                          }
                        })
                        .catch(error => {
                          console.error(`Error moving servo ${servoId} back to safe position:`, error);
                          // 显示舵机恢复错误提醒
                          showAlert('servo', `Error recovering servo ${servoId}: ${error.message || 'Unknown error'}`, 4000);
                        });
                    }
                  }
                })
                .catch(error => {
                  // 舵机控制失败，不更新虚拟关节，恢复当前位置记录
                  servoCurrentPositions[servoId] = prevPosition;
                  console.error(`Error controlling servo ${servoId}:`, error);
                  servoCommStatus[servoId].status = 'error';
                  servoCommStatus[servoId].lastError = error.message || 'Communication error';
                  updateServoStatusUI();
                  
                  // 显示舵机错误提醒
                  showAlert('servo', `Servo ${servoId} error: ${error.message || 'Communication failed'}`);
                  
                  // 尝试将舵机恢复到最后一个安全位置
                  if (servoLastSafePositions[servoId] !== prevPosition) {
                    console.log(`Attempting to move servo ${servoId} back to last safe position...`);
                    writeServoPosition(servoId, servoLastSafePositions[servoId], true)
                      .then(recoverySuccess => {
                        if (recoverySuccess) {
                          console.log(`Successfully moved servo ${servoId} back to safe position.`);
                          servoCurrentPositions[servoId] = servoLastSafePositions[servoId];
                        } else {
                          console.error(`Failed to move servo ${servoId} back to safe position.`);
                          // 显示舵机恢复错误提醒
                          showAlert('servo', `Servo ${servoId} could not recover to safe position!`, 4000);
                        }
                      })
                      .catch(error => {
                        console.error(`Error moving servo ${servoId} back to safe position:`, error);
                        // 显示舵机恢复错误提醒
                        showAlert('servo', `Error recovering servo ${servoId}: ${error.message || 'Unknown error'}`, 4000);
                      });
                  }
                });
            } else {
              // 如果没有连接真实机器人，直接更新虚拟关节
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

    // 更新机器人
    if (robot.updateMatrixWorld) {
      robot.updateMatrixWorld(true);
    }
  }

  // 返回更新函数，以便可以在渲染循环中调用
  return updateJoints;
}

/**
 * 设置控制面板UI
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
      const position = (rawPosition & 0xFFFF0000) | highByte | lowByte;
      
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
 * 直接写入舵机扭矩使能（不使用队列，仅供内部使用）
 * @param {number} servoId - 舵机ID (1-6)
 * @param {number} enable - 0: 关闭, 1: 开启
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
      
      // 修复字节顺序问题 - 通常SCS舵机使用小端序(Little Endian)
      // 从0x40D变为0xD04 (从1037变为3332)
      // 我们只需要修正低16位中的字节顺序
      const lowByte = (position & 0xFF00) >> 8;  // 取高字节并右移到低位
      const highByte = (position & 0x00FF) << 8; // 取低字节并左移到高位
      const adjustedPosition = (position & 0xFFFF0000) | highByte | lowByte;
      
      const [result, error] = await packetHandler.write4ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_POSITION, 
        adjustedPosition & 0xFFFF // 只使用低16位
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
  // 检查是否存在状态显示区域
  const statusContainer = document.getElementById('servoStatusContainer');
  if (!statusContainer) {
    return;
  }
  
  // 更新每个舵机的状态
  for (let servoId = 1; servoId <= 6; servoId++) {
    const statusElement = document.getElementById(`servo-${servoId}-status`);
    if (statusElement) {
      const servoStatus = servoCommStatus[servoId];
      
      // 根据状态设置颜色
      let statusColor = '#888'; // 默认灰色 (idle)
      
      if (servoStatus.status === 'success') {
        statusColor = '#4CAF50'; // 绿色
      } else if (servoStatus.status === 'error') {
        statusColor = '#F44336'; // 红色
      } else if (servoStatus.status === 'pending') {
        statusColor = '#2196F3'; // 蓝色
      } else if (servoStatus.status === 'warning') {
        statusColor = '#FF9800'; // 橙色（警告状态）
      }
      
      // 更新状态文本和颜色
      statusElement.style.color = statusColor;
      statusElement.textContent = servoStatus.status;
      
      // 更新错误信息提示
      const errorElement = document.getElementById(`servo-${servoId}-error`);
      if (errorElement) {
        if (servoStatus.lastError) {
          errorElement.textContent = servoStatus.lastError;
          errorElement.style.display = 'block';
        } else {
          errorElement.style.display = 'none';
        }
      }
    }
  }
}