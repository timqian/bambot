// Import all functions from the new scsServoSDK module
import {
  connect,
  disconnect,
  readPosition,
  readBaudRate,
  readMode,
  writePosition,
  writeTorqueEnable,
  writeAcceleration,
  setWheelMode,
  setPositionMode,
  writeWheelSpeed,
  syncReadPositions,
  syncWritePositions,
  syncWriteWheelSpeed, // Import the new function
  setBaudRate,
  setServoId,
} from "./scsServoSDK.mjs";

// Create an object to hold all the SCS servo functions
export const scsServoSDK = {
  connect,
  disconnect,
  readPosition,
  readBaudRate,
  readMode,
  writePosition,
  writeTorqueEnable,
  writeAcceleration,
  setWheelMode,
  setPositionMode,
  writeWheelSpeed,
  syncReadPositions,
  syncWritePositions,
  syncWriteWheelSpeed, // Add the new function to the export
  setBaudRate,
  setServoId,
};

// Future: You can add exports for other servo types here, e.g.:
// export { stsServoSDK } from './stsServoSDK.mjs';
// export { smsServoSDK } from './smsServoSDK.mjs';
