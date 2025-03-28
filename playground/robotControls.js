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

  // Get initial stepSize from the HTML slider
  const speedControl = document.getElementById('speedControl');
  let stepSize = speedControl ? MathUtils.degToRad(parseFloat(speedControl.value)) : MathUtils.degToRad(0.2);
  
  // 默认的按键-关节映射
  const keyMappings = {
    'q': { jointIndex: 0, direction: 1 },
    'a': { jointIndex: 0, direction: -1 },
    'w': { jointIndex: 1, direction: 1 },
    's': { jointIndex: 1, direction: -1 },
    'e': { jointIndex: 2, direction: 1 },
    'd': { jointIndex: 2, direction: -1 },
    'r': { jointIndex: 3, direction: 1 },
    'f': { jointIndex: 3, direction: -1 },
    't': { jointIndex: 4, direction: 1 },
    'g': { jointIndex: 4, direction: -1 },
    'y': { jointIndex: 5, direction: 1 },
    'h': { jointIndex: 5, direction: -1 },
  };
  
  // 获取机器人实际的关节名称
  const jointNames = robot && robot.joints ? Object.keys(robot.joints) : [];
  console.log('Available joints:', jointNames);
  
  window.addEventListener('keydown', (e) => {
    keyState[e.key.toLowerCase()] = true;
  });

  window.addEventListener('keyup', (e) => {
    keyState[e.key.toLowerCase()] = false;
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

    // 处理每个按键映射
    Object.keys(keyState).forEach(key => {
      if (keyState[key] && keyMappings[key]) {
        const { jointIndex, direction } = keyMappings[key];
        
        // 根据索引获取关节名称（如果可用）
        if (jointIndex < jointNames.length) {
          const jointName = jointNames[jointIndex];
          
          // 检查关节是否存在于机器人中
          if (robot.joints[jointName]) {
            // 获取当前关节值
            const currentValue = robot.joints[jointName].angle;
            // 设置新的关节值
            robot.joints[jointName].setJointValue(currentValue + direction * stepSize);
            
            // 如果连接到真实机器人，同时控制真实舵机
            if (isConnectedToRealRobot) {
              // 注意: 真实舵机ID从1到6，而jointIndex从0到5
              const servoId = jointIndex + 1;
              
              // 计算舵机相对位移量 (角度变化量转换为舵机步数)
              // 大约4096步对应一圈(2π)
              const stepChange = Math.round((direction * stepSize) * (4096 / (2 * Math.PI)));
              
              // 更新舵机位置（相对当前位置）
              // 注意: 舵机位置是0-4095范围内的值
              let newPosition = (servoCurrentPositions[servoId] + stepChange) % 4096;
              if (newPosition < 0) newPosition += 4096; // 处理负数情况
              
              // 更新当前位置记录
              servoCurrentPositions[servoId] = newPosition;
              
              // 使用队列系统控制舵机，防止并发访问
              writeServoPosition(servoId, newPosition).catch(error => {
                console.error(`Error controlling servo ${servoId}:`, error);
              });
            }
          }
        }
      }
    });

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

  // 检查键盘是否正在使用
  let keyboardActive = false;
  const keyboardStatus = document.getElementById('keyboardStatus');

  window.addEventListener('keydown', () => {
    keyboardActive = true;
    if (keyboardStatus) {
      keyboardStatus.classList.remove('inactive');
      keyboardStatus.classList.add('active');
    }
    
    // 如果2秒内没有键盘输入，则重置非活动状态
    setTimeout(() => {
      keyboardActive = false;
      if (keyboardStatus && !keyboardActive) {
        keyboardStatus.classList.remove('active');
        keyboardStatus.classList.add('inactive');
      }
    }, 2000);
  });
  
  // 添加真实机器人连接事件处理
  const connectButton = document.getElementById('connectRealRobot');
  if (connectButton) {
    connectButton.addEventListener('click', toggleRealRobotConnection);
  }
}

// 添加真实机器人操作相关的函数
/**
 * 切换真实机器人连接状态
 */
async function toggleRealRobotConnection() {
  const connectButton = document.getElementById('connectRealRobot');
  const statusIndicator = document.getElementById('realRobotStatus');
  
  if (!connectButton || !statusIndicator) return;
  
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
          // 按顺序执行，等待每个操作完成
          await writeServoAcceleration(servoId, 10);
          await writeServoSpeed(servoId, 300);
          
          // 读取当前位置并保存
          const currentPosition = await readServoPosition(servoId);
          if (currentPosition !== null) {
            servoCurrentPositions[servoId] = currentPosition;
            console.log(`Servo ${servoId} current position: ${currentPosition}`);
          } else {
            console.warn(`Could not read current position for Servo ${servoId}, using default 0`);
          }
        } catch (err) {
          console.warn(`Error initializing servo ${servoId}:`, err);
        }
      }
      
      // Update UI
      statusIndicator.classList.remove('inactive');
      statusIndicator.classList.add('active');
      connectButton.textContent = 'Disconnect Real Robot';
      isConnectedToRealRobot = true;
      
    } catch (error) {
      console.error('Connection error:', error);
      alert(`Failed to connect: ${error.message}`);
      connectButton.textContent = 'Connect Real Robot';
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
      
      // Update UI
      statusIndicator.classList.remove('active');
      statusIndicator.classList.add('inactive');
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
      // 确保能够读取舵机位置
      await writeTorqueEnableRaw(servoId, 1);
      
      // 读取当前位置
      const [rawPosition, result, error] = await packetHandler.read4ByteTxRx(
        portHandler,
        servoId,
        ADDR_SCS_PRESENT_POSITION
      );
      
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
      
      if (result !== COMM_SUCCESS) {
        console.error(`Failed to write position to servo ${servoId}: ${error}`);
      }
    } catch (error) {
      console.error(`Error writing position to servo ${servoId}:`, error);
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
      // 确保扭矩开启
      await writeTorqueEnableRaw(servoId, 1);
      
      acceleration = Math.max(0, Math.min(254, acceleration)); // Clamp to valid range
      
      const [result, error] = await packetHandler.write1ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_ACC, 
        acceleration
      );
      
      if (result !== COMM_SUCCESS) {
        console.error(`Failed to write acceleration to servo ${servoId}: ${error}`);
      }
    } catch (error) {
      console.error(`Error writing acceleration to servo ${servoId}:`, error);
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
      // 确保扭矩开启
      await writeTorqueEnableRaw(servoId, 1);
      
      speed = Math.max(0, Math.min(2000, speed)); // Clamp to valid range
      
      const [result, error] = await packetHandler.write2ByteTxRx(
        portHandler, 
        servoId, 
        ADDR_SCS_GOAL_SPEED, 
        speed
      );
      
      if (result !== COMM_SUCCESS) {
        console.error(`Failed to write speed to servo ${servoId}: ${error}`);
      }
    } catch (error) {
      console.error(`Error writing speed to servo ${servoId}:`, error);
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
  });
} 