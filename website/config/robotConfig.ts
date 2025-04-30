// Define camera settings type
type CameraSettings = {
  position: [number, number, number];
  fov: number;
};

// Define combined robot configuration type
export type RobotConfig = {
  urdfUrl: string;
  camera: CameraSettings;
  orbitTarget: [number, number, number];
  keyboardControlMap?: {
    [key: string]: string[];
  };
  jointNameIdMap?: {
    [key: string]: number;
  };
};

// Define configuration map per slug
export const robotConfigMap: { [key: string]: RobotConfig } = {
  'so-arm100': {
    urdfUrl: "/URDF/so_arm100.urdf",
    camera: { position: [-20, 10, -15], fov: 16 },
    orbitTarget: [0, 1, 0],
    keyboardControlMap: {
      1: ["1", "q"],
      2: ["2", "w"],
      3: ["3", "e"],
      4: ["4", "r"],
      5: ["5", "t"],
      6: ["6", "y"],
    },
    jointNameIdMap: {
      Rotation: 1,
      Pitch: 2,
      Elbow: 3,
      Wrist_Pitch: 4,
      Wrist_Roll: 5,
      Jaw: 6,
    },
  },
  'bambot-v0': {
    urdfUrl: "/URDF/bambot_v0.urdf",
    camera: { position: [-30, 25, 28], fov: 25 },
    orbitTarget: [0, 2, 0],
    keyboardControlMap: {
      1: ["1", "q"],
      2: ["2", "w"],
      3: ["3", "e"],
      4: ["4", "r"],
      5: ["5", "t"],
      6: ["6", "y"],
      7: ["a", "z"],
      8: ["s", "x"],
      9: ["d", "c"],
      10: ["f", "v"],
      11: ["g", "b"],
      12: ["h", "n"],
    },
    jointNameIdMap: {
      R_Rotation: 1,
      R_Pitch: 2,
      R_Elbow: 3,
      R_Wrist_Pitch: 4,
      R_Wrist_Roll: 5,
      R_Jaw: 6,
      L_Rotation: 7,
      L_Pitch: 8,
      L_Elbow: 9,
      L_Wrist_Pitch: 10,
      L_Wrist_Roll: 11,
      L_Jaw: 12,
      left_wheel: 13,
      back_wheel: 14,
      right_wheel: 15,
    },
  },
  'bambot-v0-base': {
    urdfUrl: "/URDF/bambot_v0_base.urdf",
    camera: { position: [-30, 25, 28], fov: 25 },
    orbitTarget: [0, 2, 0],
    jointNameIdMap: {
      left_wheel: 13,
      back_wheel: 14,
      right_wheel: 15,
    },
  },
  'sts3215': {
    urdfUrl: "/URDF/sts3215.urdf",
    camera: { position: [10, 10, 10], fov: 12 },
    orbitTarget: [0.5, 1, 0],
    keyboardControlMap: {
      1: ["1", "q"],
    },
    jointNameIdMap: {
      Rotation: 1,
    },
  },
};
