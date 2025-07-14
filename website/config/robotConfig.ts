// Define camera settings type
type CameraSettings = {
  position: [number, number, number];
  fov: number;
};

// Define a type for compound/linked joint movements
type CompoundMovement = {
  name: string;
  keys: string[]; // keys that trigger this movement
  primaryJoint: number; // the joint controlled by the key
  // Optional formula for calculating deltaPrimary, can use primary, dependent, etc.
  primaryFormula?: string;
  dependents: {
    joint: number;
    // The formula is used to calculate the delta for the dependent joint (deltaDependent)
    // It can use variables: primary, dependent, deltaPrimary
    // deltaPrimary itself can depend on primary and dependent angles
    // Example: "deltaPrimary * 0.8 + primary * 0.1 - dependent * 0.05"
    formula: string;
  }[];
};

// Define combined robot configuration type
export type RobotConfig = {
  urdfUrl: string;
  camera: CameraSettings;
  orbitTarget: [number, number, number];
  image?: string; // <-- Add this line
  assembleLink?: string; // <-- Add this line
  keyboardControlMap?: {
    [key: string]: string[];
  };
  jointNameIdMap?: {
    [key: string]: number;
  };
  urdfInitJointAngles?: {
    [key: string]: number;
  };
  compoundMovements?: CompoundMovement[];
  controlPrompt?: string;
  systemPrompt?: string; // <-- Add this line
};

// Define configuration map per slug
export const robotConfigMap: { [key: string]: RobotConfig } = {
  "so-arm100": {
    urdfUrl: "/URDFs/so101.urdf",
    // urdfUrl: "/so-101/so101.urdf",
    // urdfUrl: "https://lomlytpintjpeu4a.public.blob.vercel-storage.com/so101.urdf",
    // urdfUrl: "https://huggingface.co/datasets/bambot/robot-URDFs/resolve/main/URDF/so_arm100.urdf",
    // urdfUrl: "https://hf-mirror.com/datasets/bambot/robot-URDFs/resolve/main/URDF/so_arm100.urdf",
    image: "/so-arm100.jpg",
    assembleLink: "/assemble/so-101",
    camera: { position: [-30, 10, 30], fov: 12 },
    orbitTarget: [1, 2, 0],
    keyboardControlMap: {
      1: ["1", "q"],
      2: ["2", "w"],
      3: ["3", "e"],
      4: ["4", "r"],
      5: ["5", "t"],
      6: ["6", "y"],
    },
    // map between joint names in URDF and servo IDs
    jointNameIdMap: {
      Rotation: 1,
      Pitch: 2,
      Elbow: 3,
      Wrist_Pitch: 4,
      Wrist_Roll: 5,
      Jaw: 6,
    },
    urdfInitJointAngles: {
      Rotation: 180,
      Pitch: 180,
      Elbow: 180,
      Wrist_Pitch: 180,
      Wrist_Roll: 180,
      Jaw: 180,
    },
    compoundMovements: [
      // Jaw compound movements
      {
        name: "Jaw down & up",
        keys: ["8", "i"],
        primaryJoint: 2,
        primaryFormula: "primary < 100 ? 1 : -1", // Example: sign depends on primary and dependent
        dependents: [
          {
            joint: 3,
            formula: "primary < 100 ? -1.9 * deltaPrimary : 0.4 * deltaPrimary",
            // formula: "- deltaPrimary * (0.13 * Math.sin(primary * (Math.PI / 180)) + 0.13 * Math.sin((primary-dependent) * (Math.PI / 180)))/(0.13 * Math.sin((primary - dependent) * (Math.PI / 180)))",
          },
          {
            joint: 4,
            formula:
              "primary < 100 ? (primary < 10 ? 0 : 0.51 * deltaPrimary) : -0.4 * deltaPrimary",
          },
        ],
      },
      {
        name: "Jaw backward & forward",
        keys: ["o", "u"],
        primaryJoint: 2,
        primaryFormula: "1",
        dependents: [
          {
            joint: 3,
            formula: "-0.9* deltaPrimary",
          },
        ],
      },
    ],
    systemPrompt: `You can help control the so-arm100 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.
    The robot can be controlled with the following keys:
    - "q" and "1" for rotate the bot to left and right
    - "i" and "8" for moving the bot/jaw down("i") and up("8")
    - "u" and "o" for moving the bot/jaw backward("u") and forward("o")
    - "6" to open the jaw and "y" to close the jaw
    - "t" and "5" for rotating jaw
    `,
  },
  "bambot-b0": {
    urdfUrl: "/URDFs/bambot_v0.urdf",
    image: "/bambot_v0.jpg",
    assembleLink: "https://github.com/timqian/bambot/tree/main/hardware",
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
    urdfInitJointAngles: {
      R_Rotation: 180,
      R_Pitch: 180,
      R_Elbow: 180,
      R_Wrist_Pitch: 180,
      R_Wrist_Roll: 180,
      R_Jaw: 180,
      L_Rotation: 180,
      L_Pitch: 180,
      L_Elbow: 180,
      L_Wrist_Pitch: 180,
      L_Wrist_Roll: 180,
      L_Jaw: 180,
    },
    systemPrompt: `You can help control the bambot-b0 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.
    `,
  },
  "bambot-b0-base": {
    urdfUrl: "/URDFs/bambot_v0_base.urdf",
    image: "/bambot_v0_base.png",
    assembleLink: "https://github.com/timqian/bambot/tree/main/hardware",
    camera: { position: [-30, 25, 28], fov: 25 },
    orbitTarget: [0, 2, 0],
    jointNameIdMap: {
      left_wheel: 13,
      back_wheel: 14,
      right_wheel: 15,
    },
    systemPrompt: `You can help control the bambot-b0-base robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default.
    The robot can be controlled with the following keys: 
    - "ArrowUp" to move forward
    - "ArrowDown" to move backward
    - "ArrowLeft" to turn left
    - "ArrowRight" to turn right
    If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.`,
  },
  sts3215: {
    urdfUrl: "/URDFs/sts3215.urdf",
    image: "/sts3215.png",
    assembleLink: "",
    camera: { position: [10, 10, 10], fov: 12 },
    orbitTarget: [0.5, 1, 0],
    keyboardControlMap: {
      1: ["1", "q"],
    },
    jointNameIdMap: {
      Rotation: 1,
    },
    urdfInitJointAngles: {
      Rotation: 0,
    },
    systemPrompt: `You can help control the sts3215 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. The robot can be controlled with the following keys: "1" and "q" for rotation.`,
  },
  "unitree-go2": {
    urdfUrl: "/URDFs/unitree-go2/go2.urdf",
    image: "/unitree-go2.png",
    // assembleLink: "/",
    camera: { position: [-20, 15, 30], fov: 30 },
    orbitTarget: [1, 4, 0],
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
    // map between joint names in URDF and servo IDs
    jointNameIdMap: {
      FL_hip_joint: 1,
      FL_thigh_joint: 2,
      FL_calf_joint: 3,
      FR_hip_joint: 4,
      FR_thigh_joint: 5,
      FR_calf_joint: 6,
      RL_hip_joint: 7,
      RL_thigh_joint: 8,
      RL_calf_joint: 9,
      RR_hip_joint: 10,
      RR_thigh_joint: 11,
      RR_calf_joint: 12,
    },
    urdfInitJointAngles: {
      FL_hip_joint: 0,
      FL_thigh_joint: 24,
      FL_calf_joint: -48,
      FR_hip_joint: 0,
      FR_thigh_joint: 24,
      FR_calf_joint: -48,
      RL_hip_joint: 0,
      RL_thigh_joint: 24,
      RL_calf_joint: -48,
      RR_hip_joint: 0,
      RR_thigh_joint: 24,
      RR_calf_joint: -48,
    },
    systemPrompt: `You can help control the unitree-go2 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.`,
  },
  "unitree-g1": {
    urdfUrl: "/URDFs/unitree-g1/g1_23dof.urdf",
    image: "/unitree-g1.png",
    // assembleLink: "/",
    camera: { position: [-20, 15, 30], fov: 40 },
    orbitTarget: [1, 10, 0],
    keyboardControlMap: {
      1: ["1", "q"],
      2: ["2", "w"],
      3: ["3", "e"],
      4: ["4", "r"],
      5: ["5", "t"],
      6: ["6", "y"],
      7: ["7", "u"],
      8: ["8", "i"],
      9: ["9", "o"],
      10: ["0", "p"],
      11: ["-", "["],
      12: ["=", "]"],
      13: ["a", "z"],
      14: ["s", "x"],
      15: ["d", "c"],
      16: ["f", "v"],
      17: ["g", "b"],
      18: ["h", "n"],
      19: ["j", "m"],
      20: ["k", ","],
      21: ["l", "."],
      22: [";", "/"],
      23: [":", "?"],
    },
    // map between joint names in URDF and servo IDs
    jointNameIdMap: {
      left_hip_pitch_joint: 1,
      left_hip_roll_joint: 2,
      left_hip_yaw_joint: 3,
      left_knee_joint: 4,
      left_ankle_pitch_joint: 5,
      left_ankle_roll_joint: 6,
      right_hip_pitch_joint: 7,
      right_hip_roll_joint: 8,
      right_hip_yaw_joint: 9,
      right_knee_joint: 10,
      right_ankle_pitch_joint: 11,
      right_ankle_roll_joint: 12,
      waist_yaw_joint: 13,
      left_shoulder_pitch_joint: 14,
      left_shoulder_roll_joint: 15,
      left_shoulder_yaw_joint: 16,
      left_elbow_joint: 17,
      left_wrist_roll_joint: 18,
      right_shoulder_pitch_joint: 19,
      right_shoulder_roll_joint: 20,
      right_shoulder_yaw_joint: 21,
      right_elbow_joint: 22,
      right_wrist_roll_joint: 23,
    },
    urdfInitJointAngles: {},
    systemPrompt: `You can help control the unitree-go2 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.`,
  },
};
