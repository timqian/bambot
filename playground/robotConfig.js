// 机器人配置文件 - 定义不同机器人类型的配置

// 基础机器人配置
const robotConfigs = {
  // so_arm100 配置
  so_arm100: {
    name: 'SO_ARM100',
    type: 'arm',
    servos: {
      arm: 6, // 机械臂有6个舵机
    },
    // 视角和缩放配置
    viewConfig: {
      camera: {
        position: [0, 5, 10],  // 摄像机位置 [x, y, z]
        rotation: [0, 0, 0],   // 摄像机旋转角度 [x, y, z]
        fov: 45,               // 视场角(度)
        zoom: 1.0              // 缩放比例
      },
      defaultDistance: 15,     // 默认观察距离
      minDistance: 5,          // 最小缩放距离
      maxDistance: 30          // 最大缩放距离
    },
    // 控制映射配置
    controlMapping: {
      arm: {
        type: 'default',  // 默认的机械臂控制方式
        keyMapping: {
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
        }
      }
    }
  },
  
  // // lekiwi 配置
  // lekiwi: {
  //   name: 'LEKIWI',
  //   type: 'mobile_arm',
  //   servos: {
  //     arm: 6,   // 机械臂有6个舵机
  //     wheels: 3 // 轮子有3个舵机
  //   },
  //   // 控制映射配置
  //   controlMapping: {
  //     arm: {
  //       type: 'default', // 默认的机械臂控制方式
  //       keyMapping: {
  //         '1': { jointIndex: 0, direction: 1 },
  //         'q': { jointIndex: 0, direction: -1 },
  //         '2': { jointIndex: 1, direction: 1 },
  //         'w': { jointIndex: 1, direction: -1 },
  //         '3': { jointIndex: 2, direction: 1 },
  //         'e': { jointIndex: 2, direction: -1 },
  //         '4': { jointIndex: 3, direction: 1 },
  //         'r': { jointIndex: 3, direction: -1 },
  //         '5': { jointIndex: 4, direction: 1 },
  //         't': { jointIndex: 4, direction: -1 },
  //         '6': { jointIndex: 5, direction: 1 },
  //         'y': { jointIndex: 5, direction: -1 },
  //       }
  //     },
  //     wheels: {
  //       type: 'arrows',   // 使用方向键控制轮子
  //       keyMapping: {
  //         'arrowup': { jointIndex: 0, direction: 1 },
  //         'arrowdown': { jointIndex: 0, direction: -1 },
  //         'arrowleft': { jointIndex: 1, direction: 1 },
  //         'arrowright': { jointIndex: 1, direction: -1 },
  //         'pageup': { jointIndex: 2, direction: 1 },
  //         'pagedown': { jointIndex: 2, direction: -1 },
  //       }
  //     }
  //   },
  //   
  //   // 视角和缩放配置
  //   viewConfig: {
  //     camera: {
  //       position: [0, 3, 8],    // 摄像机位置 [x, y, z]
  //       rotation: [0, 0, 0],    // 摄像机旋转角度 [x, y, z]
  //       fov: 45,                // 视场角(度)
  //       zoom: 1.2               // 缩放比例
  //     },
  //     defaultDistance: 12,      // 默认观察距离
  //     minDistance: 4,           // 最小缩放距离
  //     maxDistance: 25           // 最大缩放距离
  //   },
  // },
  
  // bambot 配置
  bambot: {
    name: 'BAMBOT',
    type: 'dual_arm_mobile',
    servos: {
      leftArm: 6,   // 左机械臂有6个舵机
      rightArm: 6,  // 右机械臂有6个舵机
      wheels: 3     // 轮子有3个舵机
    },
    // 视角和缩放配置
    viewConfig: {
      camera: {
        position: [0, 7, 15],   // 摄像机位置 [x, y, z]
        rotation: [0, 0, 0],    // 摄像机旋转角度 [x, y, z]
        fov: 50,                // 视场角(度)
        zoom: 0.8               // 缩放比例 (更小的值表示更大的视野)
      },
      defaultDistance: 20,      // 默认观察距离
      minDistance: 8,           // 最小缩放距离
      maxDistance: 35           // 最大缩放距离
    },
    // 控制映射配置
    controlMapping: {
      leftArm: {
        type: 'default',   // 默认的机械臂控制方式
        keyMapping: {
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
        }
      },
      rightArm: {
        type: 'secondary', // 使用下移两排的按键控制
        keyOffset: 2,      // 按键行偏移量
        keyMapping: {
          'a': { jointIndex: 6, direction: 1 },
          'z': { jointIndex: 6, direction: -1 },
          's': { jointIndex: 7, direction: 1 },
          'x': { jointIndex: 7, direction: -1 },
          'd': { jointIndex: 8, direction: 1 },
          'c': { jointIndex: 8, direction: -1 },
          'f': { jointIndex: 9, direction: 1 },
          'v': { jointIndex: 9, direction: -1 },
          'g': { jointIndex: 10, direction: 1 },
          'b': { jointIndex: 10, direction: -1 },
          'h': { jointIndex: 11, direction: 1 },
          'n': { jointIndex: 11, direction: -1 },
        }
      },
      wheels: {
        type: 'arrows',     // 使用方向键控制轮子
        keyMapping: {
          'arrowup': [
            { jointIndex: 12, direction: 1 },
            { jointIndex: 14, direction: 1 }
          ],
          'arrowdown': [
            { jointIndex: 12, direction: -1 },
            { jointIndex: 14, direction: -1 }
          ],
          'arrowleft': [
            { jointIndex: 12, direction: 1 },
            { jointIndex: 13, direction: 1 },
            { jointIndex: 14, direction: 1 }
          ],
          'arrowright': [
            { jointIndex: 12, direction: -1 },
            { jointIndex: 13, direction: -1 }, 
            { jointIndex: 14, direction: -1 }
          ],
        }
      }
    }
  }
};

export default robotConfigs; 