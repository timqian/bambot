import { useState, useCallback, useRef } from "react";
import { ScsServoSDK } from "feetech.js";

export function useLeaderRobotControl(servoIds: number[]) {
  const scsServoSDK = useRef(new ScsServoSDK()).current;
  const [isConnected, setIsConnected] = useState(false);
  const [readableServoIds, setReadableServoIds] = useState<number[]>([]);

  // Connect to leader robot
  const connectLeader = useCallback(async () => {
    try {
      await scsServoSDK.connect();
      // Read initial positions to see which servos are readable
      const pos = await scsServoSDK.syncReadPositions(servoIds);
      const readable = Array.from(new Map(pos).keys());

      if (readable.length > 0) {
        try {
          for (const id of readable) {
            //disable torque for all servos
            await scsServoSDK.writeTorqueEnable(id, false);
          }
        } catch (e) {
          console.error(`Error disabling torque for servo:`, e);
        }
      }
      setReadableServoIds(readable);
      setIsConnected(true);
    } catch (e) {
      setIsConnected(false);
      setReadableServoIds([]);
      alert(e);
      throw e;
    }
  }, [servoIds]);

  // Disconnect
  const disconnectLeader = useCallback(async () => {
    try {
      await scsServoSDK.disconnect();
    } finally {
      setIsConnected(false);
      setReadableServoIds([]);
    }
  }, []);

  // Get joint positions
  const getPositions = useCallback(async () => {
    if (!isConnected || readableServoIds.length === 0) return new Map();
    try {
      const pos = await scsServoSDK.syncReadPositions(readableServoIds);
      return new Map<number, number>(pos);
    } catch (e) {
      console.error("Error reading positions:", e);
      return new Map();
    }
  }, [isConnected, readableServoIds]);

  return {
    isConnected,
    connectLeader,
    disconnectLeader,
    getPositions,
  };
}
