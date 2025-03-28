import { MathUtils } from 'three';

/**
 * 设置键盘控制
 * @param {Object} robot - 要控制的机器人对象
 * @returns {Function} 用于在渲染循环中更新关节的函数
 */
export function setupKeyboardControls(robot) {
  const keyState = {};
  const stepSize = MathUtils.degToRad(5); // 每次按键旋转5度
  
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
} 