/**
 * Control virtual degree with this hook, the real degree is auto managed
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { ScsServoSDK } from "feetech.js";
import { servoPositionToAngle, degreesToServoPosition } from "../lib/utils";
import { RECORDING_INTERVAL } from "@/config/uiConfig";

// import { JointDetails } from "@/components/RobotLoader"; // <-- IMPORT JointDetails type
type JointDetails = {
  name: string;
  servoId: number;
  jointType: "revolute" | "continuous";
  limit?: {
    lower?: number;
    upper?: number;
  };
};

export type JointState = {
  name: string;
  servoId?: number;
  jointType: "revolute" | "continuous";
  limit?: { lower?: number; upper?: number };
  degrees?: number | "N/A" | "error";
  speed?: number | "N/A" | "error";
};

export type UpdateJointDegrees = (
  servoId: number,
  value: number
) => Promise<void>;
export type UpdateJointSpeed = (
  servoId: number,
  speed: number
) => Promise<void>;
export type UpdateJointsDegrees = (
  updates: { servoId: number; value: number }[]
) => Promise<void>;
export type UpdateJointsSpeed = (
  updates: { servoId: number; speed: number }[]
) => Promise<void>;

export type RecordData = number[][]; // Array of arrays representing servo positions/speeds

export function useRobotControl(
  initialJointDetails: JointDetails[],
  urdfInitJointAngles?: { [key: string]: number }
) {
  // 保证 SDK 实例唯一
  const scsServoSDK = useRef(new ScsServoSDK()).current;
  const [isConnected, setIsConnected] = useState(false);
  const [jointDetails, setJointDetails] = useState(initialJointDetails);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordData, setRecordData] = useState<RecordData>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Joint states
  const [jointStates, setJointStates] = useState<JointState[]>(
    jointDetails.map((j, index) => ({
      jointType: j.jointType,
      degrees:
        j.jointType === "revolute"
          ? urdfInitJointAngles?.[j.name] ?? 180
          : undefined,
      speed: j.jointType === "continuous" ? 0 : undefined,
      servoId: j.servoId, // Assign servoId based on index
      name: j.name, // Map name from JointDetails
      limit: j.limit, // Map limit from JointDetails
    }))
  );

  // Store initial positions of servos
  const [initialPositions, setInitialPositions] = useState<number[]>([]);

  useEffect(() => {
    setJointStates(
      jointDetails.map((j, index) => ({
        jointType: j.jointType,
        degrees:
          j.jointType === "revolute"
            ? urdfInitJointAngles?.[j.name] ?? 180
            : undefined,
        speed: j.jointType === "continuous" ? 0 : undefined,
        servoId: j.servoId, // Assign servoId based on index
        name: j.name, // Map name from JointDetails
        limit: j.limit, // Map limit from JointDetails
      }))
    );
  }, [jointDetails, urdfInitJointAngles]);

  // Connect to the robot
  const connectRobot = useCallback(async () => {
    try {
      await scsServoSDK.connect();
      const newStates = [...jointStates];
      const initialPos: number[] = [];
      for (let i = 0; i < jointDetails.length; i++) {
        try {
          if (jointDetails[i].jointType === "continuous") {
            await scsServoSDK.setWheelMode(jointDetails[i].servoId);
            newStates[i].speed = 0;
          } else {
            await scsServoSDK.setPositionMode(jointDetails[i].servoId);
            const servoPosition = await scsServoSDK.readPosition(
              jointDetails[i].servoId
            );
            const positionInDegrees = servoPositionToAngle(servoPosition);
            initialPos.push(positionInDegrees);
            newStates[i].degrees = positionInDegrees;

            // Enable torque for revolute servos
            await scsServoSDK.writeTorqueEnable(jointDetails[i].servoId, true);
          }
        } catch (error) {
          console.error(
            `Failed to initialize joint ${jointDetails[i].servoId}:`,
            error
          );
          initialPos.push(0);
          if (jointDetails[i].jointType === "revolute") {
            newStates[i].degrees = "error";
          } else if (jointDetails[i].jointType === "continuous") {
            newStates[i].speed = "error";
          }
        }
      }
      setInitialPositions(initialPos);
      setJointStates(newStates);
      setIsConnected(true);
      console.log("Robot connected successfully.");
    } catch (error) {
      setIsConnected(false);
      alert(error);
      console.error("Failed to connect to the robot:", error);
    }
  }, [jointStates, jointDetails]);

  // Disconnect from the robot
  const disconnectRobot = useCallback(async () => {
    try {
      // Disable torque for revolute servos and set wheel speed to 0 for continuous servos
      for (let i = 0; i < jointDetails.length; i++) {
        try {
          if (jointDetails[i].jointType === "continuous") {
            await scsServoSDK.writeWheelSpeed(jointDetails[i].servoId, 0);
          }
          await scsServoSDK.writeTorqueEnable(jointDetails[i].servoId, false);
        } catch (error) {
          console.error(
            `Failed to reset joint ${jointDetails[i].servoId} during disconnect:`,
            error
          );
        }
      }

      await scsServoSDK.disconnect();
      setIsConnected(false);
      console.log("Robot disconnected successfully.");
    } catch (error) {
      console.error("Failed to disconnect from the robot:", error);
    }
  }, [jointDetails]);

  // Recording functions - 使用定时器确保每20ms都记录一帧
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordData([]);

    recordingIntervalRef.current = setInterval(() => {
      const currentFrame: number[] = [];

      jointDetails.forEach((joint) => {
        const jointState = jointStates.find(
          (state) => state.servoId === joint.servoId
        );
        if (jointState) {
          if (joint.jointType === "revolute") {
            currentFrame.push(jointState.degrees ?? 0);
          } else if (joint.jointType === "continuous") {
            currentFrame.push(jointState.speed ?? 0);
          }
        } else {
          currentFrame.push(0);
        }
      });

      setRecordData((prev) => [...prev, currentFrame]);
    }, RECORDING_INTERVAL);
  }, [jointDetails, jointStates]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const clearRecordData = useCallback(() => {
    setRecordData([]);
  }, []);

  // Clean up recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Update revolute joint degrees
  const updateJointDegrees = useCallback(
    async (servoId: number, value: number) => {
      const newStates = [...jointStates];
      const jointIndex = newStates.findIndex(
        (state) => state.servoId === servoId
      ); // Find joint by servoId

      if (jointIndex !== -1) {
        newStates[jointIndex].degrees = value;

        if (isConnected) {
          try {
            // Check if value is within the valid range (0-360 degrees)
            if (value >= 0 && value <= 360) {
              const servoPosition = degreesToServoPosition(value); // Use utility function
              await scsServoSDK.writePosition(
                servoId,
                Math.round(servoPosition)
              );
            } else {
              console.warn(
                `Value ${value} for servo ${servoId} is out of range (0-360). Skipping update.`
              );
            }
          } catch (error) {
            console.error(
              `Failed to update servo degrees for joint with servoId ${servoId}:`,
              error
            );
            newStates[jointIndex].degrees = "error";
          }
        }

        setJointStates(newStates);
      }
    },
    [jointStates, isConnected]
  );

  // Update continuous joint speed
  const updateJointSpeed = useCallback(
    async (servoId: number, speed: number) => {
      const newStates = [...jointStates];
      const jointIndex = newStates.findIndex(
        (state) => state.servoId === servoId
      ); // Find joint by servoId

      if (jointIndex !== -1) {
        newStates[jointIndex].speed = speed;

        if (isConnected) {
          try {
            await scsServoSDK.writeWheelSpeed(servoId, speed); // Send speed command to the robot
          } catch (error) {
            console.error(
              `Failed to update speed for joint with servoId ${servoId}:`,
              error
            );
            newStates[jointIndex].speed = "error"; // Set speed to "error"
          }
        }

        setJointStates(newStates);
      }
    },
    [jointStates, isConnected]
  );

  // Update multiple joints' degrees simultaneously
  const updateJointsDegrees: UpdateJointsDegrees = useCallback(
    async (updates) => {
      const newStates = [...jointStates];
      const servoPositions: Record<number, number> = {};
      const validUpdates: {
        servoId: number;
        value: number;
      }[] = [];

      updates.forEach(({ servoId, value }) => {
        const jointIndex = newStates.findIndex(
          (state) => state.servoId === servoId
        ); // Find joint by servoId

        if (
          jointIndex !== -1 &&
          newStates[jointIndex].jointType === "revolute"
        ) {
          newStates[jointIndex].degrees = value;

          if (isConnected) {
            if (value >= 0 && value <= 360) {
              const servoPosition = degreesToServoPosition(value); // Use utility function
              servoPositions[servoId] = Math.round(servoPosition);
              validUpdates.push({ servoId, value }); // Store valid updates
            } else {
              console.warn(
                `Value ${value} for servo ${servoId} is out of range (0-360). Skipping update in sync write.`
              );
            }
          }
        }
      });

      if (isConnected && Object.keys(servoPositions).length > 0) {
        try {
          await scsServoSDK.syncWritePositions(servoPositions); // Use syncWritePositions with only valid positions
        } catch (error) {
          console.error("Failed to update multiple servo degrees:", error);
          validUpdates.forEach(({ servoId }) => {
            const jointIndex = newStates.findIndex(
              (state) => state.servoId === servoId
            );
            if (jointIndex !== -1) {
              newStates[jointIndex].degrees = "error";
            }
          });
        }
      }

      setJointStates(newStates);
    },
    [jointStates, isConnected]
  );

  // Update multiple joints' speed simultaneously
  const updateJointsSpeed: UpdateJointsSpeed = useCallback(
    async (updates) => {
      const newStates = [...jointStates];
      const servoSpeeds: Record<number, number> = {};

      updates.forEach(({ servoId, speed }) => {
        const jointIndex = newStates.findIndex(
          (state) => state.servoId === servoId
        );

        if (jointIndex !== -1) {
          newStates[jointIndex].speed = speed;

          if (isConnected) {
            servoSpeeds[servoId] = speed;
          }
        }
      });

      if (isConnected && Object.keys(servoSpeeds).length > 0) {
        try {
          await scsServoSDK.syncWriteWheelSpeed(servoSpeeds);
        } catch (error) {
          console.error("Failed to update multiple servo speeds:", error);
          updates.forEach(({ servoId }) => {
            const jointIndex = newStates.findIndex(
              (state) => state.servoId === servoId
            );
            if (jointIndex !== -1) {
              newStates[jointIndex].speed = "error";
            }
          });
        }
      }

      setJointStates(newStates);
    },
    [jointStates, isConnected]
  );

  return {
    isConnected,
    connectRobot,
    disconnectRobot,
    jointStates,
    updateJointDegrees,
    updateJointsDegrees,
    updateJointSpeed,
    updateJointsSpeed,
    setJointDetails,
    // Recording functions
    isRecording,
    recordData,
    startRecording,
    stopRecording,
    clearRecordData,
  };
}
