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
  keyboardControlMap?: {
    [key: string]: string[];
  };
  jointNameIdMap?: {
    [key: string]: number;
  };
  compoundMovements?: CompoundMovement[];
  controlPrompt?: string;
  systemPrompt?: string; // <-- Add this line
};

// Define configuration map per slug
export const robotConfigMap: { [key: string]: RobotConfig } = {
  "so-arm100": {
    urdfUrl: "/URDF/so_arm100.urdf",
    // urdfUrl: "/so-101/so101.urdf",
        // urdfUrl: "https://lomlytpintjpeu4a.public.blob.vercel-storage.com/so-101/so101.urdf",
    // urdfUrl: "https://huggingface.co/datasets/bambot/robot-URDFs/resolve/main/URDF/so_arm100.urdf",
    // urdfUrl: "https://hf-mirror.com/datasets/bambot/robot-URDFs/resolve/main/URDF/so_arm100.urdf",
    camera: { position: [-20, 10, -15], fov: 20 },
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
  "bambot-v0": {
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
    systemPrompt: `You can help control the bambot-v0 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.
    `,
  },
  "bambot-v0-base": {
    urdfUrl: "/URDF/bambot_v0_base.urdf",
    camera: { position: [-30, 25, 28], fov: 25 },
    orbitTarget: [0, 2, 0],
    jointNameIdMap: {
      left_wheel: 13,
      back_wheel: 14,
      right_wheel: 15,
    },
    systemPrompt: `You can help control the bambot-v0-base robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default.
    The robot can be controlled with the following keys: 
    - "ArrowUp" to move forward
    - "ArrowDown" to move backward
    - "ArrowLeft" to turn left
    - "ArrowRight" to turn right
    If the user describes roughly wanting to make it longer or shorter, adjust the duration accordingly.`,
  },
  sts3215: {
    urdfUrl: "/URDF/sts3215.urdf",
    camera: { position: [10, 10, 10], fov: 12 },
    orbitTarget: [0.5, 1, 0],
    keyboardControlMap: {
      1: ["1", "q"],
    },
    jointNameIdMap: {
      Rotation: 1,
    },
    systemPrompt: `You can help control the sts3215 robot by pressing keyboard keys. Use the keyPress tool to simulate key presses. Each key will be held down for 1 second by default. The robot can be controlled with the following keys: "1" and "q" for rotation.`,
  },
};
