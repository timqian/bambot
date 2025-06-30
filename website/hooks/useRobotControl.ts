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
  virtualDegrees?: number;
  realDegrees?: number | "N/A" | "error";
  virtualSpeed?: number;
  realSpeed?: number | "N/A" | "error";
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

export function useRobotControl(initialJointDetails: JointDetails[]) {
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
      virtualDegrees: j.jointType === "revolute" ? 0 : undefined,
      realDegrees: j.jointType === "revolute" ? "N/A" : undefined,
      virtualSpeed: j.jointType === "continuous" ? 0 : undefined,
      realSpeed: j.jointType === "continuous" ? "N/A" : undefined,
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
        virtualDegrees: j.jointType === "revolute" ? 0 : undefined,
        realDegrees: j.jointType === "revolute" ? "N/A" : undefined,
        virtualSpeed: j.jointType === "continuous" ? 0 : undefined,
        realSpeed: j.jointType === "continuous" ? "N/A" : undefined,
        servoId: j.servoId, // Assign servoId based on index
        name: j.name, // Map name from JointDetails
        limit: j.limit, // Map limit from JointDetails
      }))
    );
  }, [jointDetails]);

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
            newStates[i].realSpeed = 0;
          } else {
            await scsServoSDK.setPositionMode(jointDetails[i].servoId);
            const servoPosition = await scsServoSDK.readPosition(
              jointDetails[i].servoId
            );
            const positionInDegrees = servoPositionToAngle(servoPosition);
            initialPos.push(positionInDegrees);
            newStates[i].realDegrees = positionInDegrees;

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
            newStates[i].realDegrees = "error";
          } else if (jointDetails[i].jointType === "continuous") {
            newStates[i].realSpeed = "error";
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

      // Reset realDegrees of revolute joints to "N/A"
      setJointStates((prevStates) =>
        prevStates.map((state) =>
          state.jointType === "revolute"
            ? { ...state, realDegrees: "N/A" }
            : { ...state, realSpeed: "N/A" }
        )
      );
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
            currentFrame.push(jointState.virtualDegrees ?? 0);
          } else if (joint.jointType === "continuous") {
            currentFrame.push(jointState.virtualSpeed ?? 0);
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
        newStates[jointIndex].virtualDegrees = value;

        if (isConnected) {
          try {
            const relativeValue = (initialPositions[jointIndex] || 0) + value; // Calculate relative position
            // Check if relativeValue is within the valid range (0-360 degrees)
            if (relativeValue >= 0 && relativeValue <= 360) {
              const servoPosition = degreesToServoPosition(relativeValue); // Use utility function
              await scsServoSDK.writePosition(
                servoId,
                Math.round(servoPosition)
              );
              newStates[jointIndex].realDegrees = relativeValue; // Update relative realDegrees
            } else {
              console.warn(
                `Relative value ${relativeValue} for servo ${servoId} is out of range (0-360). Skipping update.`
              );
              // Optionally update realDegrees to reflect the attempted value or keep it as is
              // newStates[jointIndex].realDegrees = relativeValue; // Or keep the previous value
            }
          } catch (error) {
            console.error(
              `Failed to update servo degrees for joint with servoId ${servoId}:`,
              error
            );
            // Consider setting realDegrees to 'error' or keeping the last known value
            // newStates[jointIndex].realDegrees = 'error';
          }
        }

        setJointStates(newStates);
      }
    },
    [jointStates, isConnected, initialPositions]
  );

  // Update continuous joint speed
  const updateJointSpeed = useCallback(
    async (servoId: number, speed: number) => {
      const newStates = [...jointStates];
      const jointIndex = newStates.findIndex(
        (state) => state.servoId === servoId
      ); // Find joint by servoId

      if (jointIndex !== -1) {
        newStates[jointIndex].virtualSpeed = speed;

        if (isConnected) {
          try {
            await scsServoSDK.writeWheelSpeed(servoId, speed); // Send speed command to the robot
            newStates[jointIndex].realSpeed = speed; // Update realSpeed
          } catch (error) {
            console.error(
              `Failed to update speed for joint with servoId ${servoId}:`,
              error
            );
            newStates[jointIndex].realSpeed = "error"; // Set realSpeed to "error"
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
        relativeValue: number;
      }[] = [];

      updates.forEach(({ servoId, value }) => {
        const jointIndex = newStates.findIndex(
          (state) => state.servoId === servoId
        ); // Find joint by servoId

        if (jointIndex !== -1) {
          // Update virtual degrees regardless of connection status
          newStates[jointIndex].virtualDegrees = value;

          // Only calculate and check relative value if connected
          if (isConnected) {
            const relativeValue = (initialPositions[jointIndex] || 0) + value; // Calculate relative position
            // Check if relativeValue is within the valid range (0-360 degrees)
            if (relativeValue >= 0 && relativeValue <= 360) {
              const servoPosition = degreesToServoPosition(relativeValue); // Use utility function
              servoPositions[servoId] = Math.round(servoPosition);
              validUpdates.push({ servoId, value, relativeValue }); // Store valid updates
            } else {
              console.warn(
                `Relative value ${relativeValue} for servo ${servoId} is out of range (0-360). Skipping update in sync write.`
              );
              // Optionally update realDegrees for the skipped joint here or after the sync write
              // newStates[jointIndex].realDegrees = relativeValue; // Or keep the previous value
            }
          }
        }
      });

      if (isConnected && Object.keys(servoPositions).length > 0) {
        // Only write if there are valid positions and connected
        try {
          await scsServoSDK.syncWritePositions(servoPositions); // Use syncWritePositions with only valid positions
          validUpdates.forEach(({ servoId, relativeValue }) => {
            // Update realDegrees only for successfully written joints
            const jointIndex = newStates.findIndex(
              (state) => state.servoId === servoId
            );
            if (jointIndex !== -1) {
              newStates[jointIndex].realDegrees = relativeValue; // Update realDegrees
            }
          });
        } catch (error) {
          console.error("Failed to update multiple servo degrees:", error);
          // Handle potential errors, maybe set corresponding realDegrees to 'error'
          validUpdates.forEach(({ servoId }) => {
            const jointIndex = newStates.findIndex(
              (state) => state.servoId === servoId
            );
            if (jointIndex !== -1) {
              // newStates[jointIndex].realDegrees = 'error'; // Example error handling
            }
          });
        }
      }

      setJointStates(newStates);
    },
    [jointStates, isConnected, initialPositions]
  );

  // Update multiple joints' speed simultaneously
  const updateJointsSpeed: UpdateJointsSpeed = useCallback(
    async (updates) => {
      const newStates = [...jointStates];
      const servoSpeeds: Record<number, number> = {};
      const validUpdates: { servoId: number; speed: number }[] = [];

      updates.forEach(({ servoId, speed }) => {
        const jointIndex = newStates.findIndex(
          (state) => state.servoId === servoId
        );

        if (jointIndex !== -1) {
          newStates[jointIndex].virtualSpeed = speed;

          if (isConnected) {
            servoSpeeds[servoId] = speed;
            validUpdates.push({ servoId, speed });
          }
        }
      });

      if (isConnected && Object.keys(servoSpeeds).length > 0) {
        try {
          await scsServoSDK.syncWriteWheelSpeed(servoSpeeds);
          validUpdates.forEach(({ servoId, speed }) => {
            const jointIndex = newStates.findIndex(
              (state) => state.servoId === servoId
            );
            if (jointIndex !== -1) {
              newStates[jointIndex].realSpeed = speed;
            }
          });
        } catch (error) {
          console.error("Failed to update multiple servo speeds:", error);
          validUpdates.forEach(({ servoId }) => {
            const jointIndex = newStates.findIndex(
              (state) => state.servoId === servoId
            );
            if (jointIndex !== -1) {
              newStates[jointIndex].realSpeed = "error";
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
