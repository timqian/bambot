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
  ADDR_SCS_PRESENT_POSITION
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
  const jointNames = robot && robot.joints ? Object.keys(robot.joints) : [];
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
            // 设置新的关节值
            robot.joints[jointName].setJointValue(currentValue + direction * stepSize);
            
            // 如果连接到真实机器人，同时控制真实舵机
            if (isConnectedToRealRobot) {
              // 注意: 真实舵机ID从1到6，而jointIndex从0到5
              
              // 计算舵机相对位移量 (角度变化量转换为舵机步数)
              // 大约4096步对应一圈(2π)
              const stepChange = Math.round((direction * stepSize) * (4096 / (2 * Math.PI)));
              
              // 更新舵机位置（相对当前位置）
              // 注意: 舵机位置是0-4095范围内的值
              let newPosition = (servoCurrentPositions[servoId] + stepChange) % 4096;
              if (newPosition < 0) newPosition += 4096; // 处理负数情况
              
              // 更新当前位置记录
              servoCurrentPositions[servoId] = newPosition;
              
              // 更新舵机状态为待处理
              servoCommStatus[servoId].status = 'pending';
              updateServoStatusUI();
              
              // 使用队列系统控制舵机，防止并发访问
              writeServoPosition(servoId, newPosition).catch(error => {
                console.error(`Error controlling servo ${servoId}:`, error);
                servoCommStatus[servoId].status = 'error';
                servoCommStatus[servoId].lastError = error.message || 'Communication error';
                updateServoStatusUI();
              });
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
          
          // 按顺序执行，等待每个操作完成
          await writeServoAcceleration(servoId, 10);
          await writeServoSpeed(servoId, 300);
          
          // 读取当前位置并保存
          const currentPosition = await readServoPosition(servoId);
          if (currentPosition !== null) {
            servoCurrentPositions[servoId] = currentPosition;
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
      
      // 重置所有舵机状态为idle
      for (let servoId = 1; servoId <= 6; servoId++) {
        servoCommStatus[servoId] = { status: 'idle', lastError: null };
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
      
      // 确保能够读取舵机位置
      await writeTorqueEnableRaw(servoId, 1);
      
      // 读取当前位置
      const [rawPosition, result, error] = await packetHandler.read4ByteTxRx(
        portHandler,
        servoId,
        ADDR_SCS_PRESENT_POSITION
      );
      
      // 更新舵机状态
      if (servoCommStatus[servoId]) {
        if (result === COMM_SUCCESS) {
          servoCommStatus[servoId].status = 'success';
          servoCommStatus[servoId].lastError = null;
        } else {
          servoCommStatus[servoId].status = 'error';
          servoCommStatus[servoId].lastError = `Read error ${error} (code: ${result})`;
          console.error(`Failed to read position from servo ${servoId}: ${error}`);
          updateServoStatusUI();
          return null;
        }
        updateServoStatusUI();
      }
      
      if (result !== COMM_SUCCESS) {
        console.error(`Failed to read position from servo ${servoId}: ${error}`);
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
 */
async function writeServoPosition(servoId, position) {
  if (!isConnectedToRealRobot || !portHandler || !packetHandler) return;
  
  return queueCommand(async () => {
    try {
      // 更新舵机状态为处理中
      servoCommStatus[servoId].status = 'pending';
      servoCommStatus[servoId].lastError = null;
      updateServoStatusUI();
      
      // 如果有必要，先确保扭矩开启
      await writeTorqueEnableRaw(servoId, 1);
      
      // Write position to servo
      position = Math.max(0, Math.min(4095, position)); // Clamp to valid range
      
      // 修复字节顺序问题 - 通常SCS舵机使用小端序(Little Endian)
      // 从0x40D变为0xD04 (从1037变为3332)
      // 我们只需要修正低16位中的字节顺序
      const lowByte = (position & 0xFF00) >> 8;  // 取高字节并右移到低位
      const highByte = (position & 0x00FF) << 8; // 取低字节并左移到高位
      const adjustedPosition = (position & 0xFFFF0000) | highByte | lowByte;
      
      // 调试输出
      console.log(`Writing servo ${servoId} position: ${position} (0x${position.toString(16)}) -> adjusted: ${adjustedPosition & 0xFFFF} (0x${(adjustedPosition & 0xFFFF).toString(16)})`);
      
      const [result, error] = await packetHandler.write4ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_POSITION, 
        adjustedPosition & 0xFFFF // 只使用低16位
      );
      
      // 更新舵机状态
      if (result === COMM_SUCCESS) {
        servoCommStatus[servoId].status = 'success';
        servoCommStatus[servoId].lastError = null;
      } else {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = `Error ${error} (code: ${result})`;
        console.error(`Failed to write position to servo ${servoId}: ${error}`);
      }
      updateServoStatusUI();
      
      return result === COMM_SUCCESS;
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
      
      // 确保扭矩开启
      await writeTorqueEnableRaw(servoId, 1);
      
      acceleration = Math.max(0, Math.min(254, acceleration)); // Clamp to valid range
      
      const [result, error] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_ACC, 
        acceleration
      );
      
      // 更新舵机状态
      if (result === COMM_SUCCESS) {
        servoCommStatus[servoId].status = 'success';
        servoCommStatus[servoId].lastError = null;
      } else {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = `Acceleration control error ${error} (code: ${result})`;
        console.error(`Failed to write acceleration to servo ${servoId}: ${error}`);
      }
      updateServoStatusUI();
      
      return result === COMM_SUCCESS;
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
      
      // 确保扭矩开启
      await writeTorqueEnableRaw(servoId, 1);
      
      speed = Math.max(0, Math.min(2000, speed)); // Clamp to valid range
      
      const [result, error] = await packetHandler.write2ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_SPEED, 
        speed
      );
      
      // 更新舵机状态
      if (result === COMM_SUCCESS) {
        servoCommStatus[servoId].status = 'success';
        servoCommStatus[servoId].lastError = null;
      } else {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = `Speed control error ${error} (code: ${result})`;
        console.error(`Failed to write speed to servo ${servoId}: ${error}`);
      }
      updateServoStatusUI();
      
      return result === COMM_SUCCESS;
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
      
      // 更新舵机状态
      if (result === COMM_SUCCESS) {
        servoCommStatus[servoId].status = 'success';
        servoCommStatus[servoId].lastError = null;
      } else {
        servoCommStatus[servoId].status = 'error';
        servoCommStatus[servoId].lastError = `Torque control error ${error} (code: ${result})`;
        console.error(`Failed to write torque enable to servo ${servoId}: ${error}`);
      }
      updateServoStatusUI();
      
      return result === COMM_SUCCESS;
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