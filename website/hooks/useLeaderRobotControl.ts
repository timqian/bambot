import { useState, useCallback, useRef } from "react";
import { ScsServoSDK } from "feetech.js";

export function useLeaderRobotControl(servoIds: number[]) {
  const scsServoSDK = useRef(new ScsServoSDK()).current;
  const [isConnected, setIsConnected] = useState(false);
  const [initialPositions, setInitialPositions] = useState<Map<number, number>>(
    new Map()
  );
  const [readableServoIds, setReadableServoIds] = useState<number[]>([]);

  // Connect to leader robot
  const connectLeader = useCallback(async () => {
    try {
      await scsServoSDK.connect();
      // Read initial positions
      const pos = await scsServoSDK.syncReadPositions(servoIds);
      const initialPosMap = new Map(pos);
      setInitialPositions(initialPosMap);
      // Record servo IDs that can be successfully read
      const readable = Array.from(initialPosMap.keys());
      setReadableServoIds(readable);
      setIsConnected(true);
    } catch (e) {
      setIsConnected(false);
      setInitialPositions(new Map());
      setReadableServoIds([]);
      alert(e);
      throw e;
    }

    try {
      for (const id of readableServoIds) {
        await scsServoSDK.writeTorqueEnable(id, false);
      }
    } catch (e) {
      console.error(`Error disabling torque for servo ${id}:`, e);
    }
  }, [servoIds]);

  // Disconnect
  const disconnectLeader = useCallback(async () => {
    try {
      await scsServoSDK.disconnect();
    } finally {
      setIsConnected(false);
      setInitialPositions(new Map());
      setReadableServoIds([]);
    }
  }, []);

  // Get joint angles and calculate position changes
  const getPositionChange = useCallback(async () => {
    if (!isConnected || readableServoIds.length === 0) return new Map();
    try {
      const pos = await scsServoSDK.syncReadPositions(readableServoIds);
      // Calculate relative position change for each joint
      const positionChange = new Map<number, number>();
      pos.forEach((p, sid) => {
        const servoId = Number(sid);
        const initial = initialPositions.get(servoId) ?? 0;
        positionChange.set(servoId, p - initial);
      });
      return positionChange;
    } catch (e) {
      console.error("Error reading positions:", e);
      return new Map();
    }
  }, [isConnected, readableServoIds, initialPositions]);

  return {
    isConnected,
    connectLeader,
    disconnectLeader,
    initialPositions,
    getPositionChange,
  };
}
