import {
  PortHandler,
  PacketHandler,
  COMM_SUCCESS,
  COMM_RX_TIMEOUT,
  COMM_RX_CORRUPT,
  COMM_RX_FAIL,
  COMM_TX_FAIL,
  COMM_NOT_AVAILABLE,
  SCS_LOBYTE,
  SCS_HIBYTE,
  SCS_MAKEWORD,
  GroupSyncRead, // Import GroupSyncRead
  GroupSyncWrite, // Import GroupSyncWrite
} from "./lowLevelSDK.mjs";

// Import address constants from the correct file
import {
  ADDR_SCS_PRESENT_POSITION,
  ADDR_SCS_GOAL_POSITION,
  ADDR_SCS_TORQUE_ENABLE,
  ADDR_SCS_GOAL_ACC,
  ADDR_SCS_GOAL_SPEED,
} from "./scsservo_constants.mjs";

// Define constants not present in scsservo_constants.mjs
const ADDR_SCS_MODE = 33;
const ADDR_SCS_LOCK = 55;
const ADDR_SCS_ID = 5; // Address for Servo ID
const ADDR_SCS_BAUD_RATE = 6; // Address for Baud Rate

// Module-level variables for handlers
let portHandler = null;
let packetHandler = null;

/**
 * Connects to the serial port and initializes handlers.
 * @param {object} [options] - Connection options.
 * @param {number} [options.baudRate=1000000] - The baud rate for the serial connection.
 * @param {number} [options.protocolEnd=0] - The protocol end setting (0 for STS/SMS, 1 for SCS).
 * @returns {Promise<true>} Resolves with true on successful connection.
 * @throws {Error} If connection fails or port cannot be opened/selected.
 */
export async function connect(options = {}) {
  if (portHandler && portHandler.isOpen) {
    console.log("Already connected.");
    return true;
  }

  const { baudRate = 1000000, protocolEnd = 0 } = options;

  try {
    portHandler = new PortHandler();
    const portRequested = await portHandler.requestPort();
    if (!portRequested) {
      portHandler = null;
      throw new Error("Failed to select a serial port.");
    }

    portHandler.setBaudRate(baudRate);
    const portOpened = await portHandler.openPort();
    if (!portOpened) {
      await portHandler.closePort().catch(console.error); // Attempt cleanup
      portHandler = null;
      throw new Error(`Failed to open port at baudrate ${baudRate}.`);
    }

    packetHandler = new PacketHandler(protocolEnd);
    console.log(
      `Connected to serial port at ${baudRate} baud, protocol end: ${protocolEnd}.`
    );
    return true;
  } catch (err) {
    console.error("Error during connection:", err);
    if (portHandler) {
      try {
        await portHandler.closePort();
      } catch (closeErr) {
        console.error("Error closing port after connection failure:", closeErr);
      }
    }
    portHandler = null;
    packetHandler = null;
    // Re-throw the original or a new error
    throw new Error(`Connection failed: ${err.message}`);
  }
}

/**
 * Disconnects from the serial port.
 * @returns {Promise<true>} Resolves with true on successful disconnection.
 * @throws {Error} If disconnection fails.
 */
export async function disconnect() {
  if (!portHandler || !portHandler.isOpen) {
    console.log("Already disconnected.");
    return true;
  }

  try {
    await portHandler.closePort();
    portHandler = null;
    packetHandler = null;
    console.log("Disconnected from serial port.");
    return true;
  } catch (err) {
    console.error("Error during disconnection:", err);
    // Attempt to nullify handlers even if close fails
    portHandler = null;
    packetHandler = null;
    throw new Error(`Disconnection failed: ${err.message}`);
  }
}

/**
 * Checks if the SDK is connected. Throws an error if not.
 * @throws {Error} If not connected.
 */
function checkConnection() {
  if (!portHandler || !packetHandler) {
    throw new Error("Not connected. Call connect() first.");
  }
}

/**
 * Reads the current position of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<number>} Resolves with the position (0-4095).
 * @throws {Error} If not connected, read fails, or an exception occurs.
 */
export async function readPosition(servoId) {
  checkConnection();
  try {
    const [position, result, error] = await packetHandler.read2ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_PRESENT_POSITION
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error reading position from servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error code: ${error}`
      );
    }
    return position & 0xffff; // Ensure it's within 16 bits
  } catch (err) {
    console.error(`Exception reading position from servo ${servoId}:`, err);
    throw new Error(
      `Exception reading position from servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Reads the current baud rate index of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<number>} Resolves with the baud rate index (0-7).
 * @throws {Error} If not connected, read fails, or an exception occurs.
 */
export async function readBaudRate(servoId) {
  checkConnection();
  try {
    const [baudIndex, result, error] = await packetHandler.read1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_BAUD_RATE
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error reading baud rate from servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error code: ${error}`
      );
    }
    return baudIndex;
  } catch (err) {
    console.error(`Exception reading baud rate from servo ${servoId}:`, err);
    throw new Error(
      `Exception reading baud rate from servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Reads the current operating mode of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<number>} Resolves with the mode (0 for position, 1 for wheel).
 * @throws {Error} If not connected, read fails, or an exception occurs.
 */
export async function readMode(servoId) {
  checkConnection();
  try {
    const [modeValue, result, error] = await packetHandler.read1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_MODE
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error reading mode from servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error code: ${error}`
      );
    }
    return modeValue;
  } catch (err) {
    console.error(`Exception reading mode from servo ${servoId}:`, err);
    throw new Error(
      `Exception reading mode from servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Writes a target position to a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {number} position - The target position value (0-4095).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, position is out of range, write fails, or an exception occurs.
 */
export async function writePosition(servoId, position) {
  checkConnection();
  try {
    // Validate position range
    if (position < 0 || position > 4095) {
      throw new Error(
        `Invalid position value ${position} for servo ${servoId}. Must be between 0 and 4095.`
      );
    }
    const targetPosition = Math.round(position); // Ensure integer value

    const [result, error] = await packetHandler.write2ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_GOAL_POSITION,
      targetPosition
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error writing position to servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error code: ${error}`
      );
    }
    return "success";
  } catch (err) {
    console.error(`Exception writing position to servo ${servoId}:`, err);
    // Re-throw the original error or a new one wrapping it
    throw new Error(
      `Failed to write position to servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Enables or disables the torque of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {boolean} enable - True to enable torque, false to disable.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, write fails, or an exception occurs.
 */
export async function writeTorqueEnable(servoId, enable) {
  checkConnection();
  try {
    const enableValue = enable ? 1 : 0;
    const [result, error] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_TORQUE_ENABLE,
      enableValue
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error setting torque for servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error code: ${error}`
      );
    }
    return "success";
  } catch (err) {
    console.error(`Exception setting torque for servo ${servoId}:`, err);
    throw new Error(
      `Exception setting torque for servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Sets the acceleration profile for a servo's movement.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {number} acceleration - The acceleration value (0-254).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, write fails, or an exception occurs.
 */
export async function writeAcceleration(servoId, acceleration) {
  checkConnection();
  try {
    const clampedAcceleration = Math.max(
      0,
      Math.min(254, Math.round(acceleration))
    );
    const [result, error] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_GOAL_ACC,
      clampedAcceleration
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error writing acceleration to servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error code: ${error}`
      );
    }
    return "success";
  } catch (err) {
    console.error(`Exception writing acceleration to servo ${servoId}:`, err);
    throw new Error(
      `Exception writing acceleration to servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Helper to attempt locking a servo, logging errors without throwing.
 * @param {number} servoId
 */
async function tryLockServo(servoId) {
  try {
    await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
  } catch (lockErr) {
    console.error(`Failed to re-lock servo ${servoId}:`, lockErr);
  }
}

/**
 * Sets a servo to wheel mode (continuous rotation).
 * Requires unlocking, setting mode, and locking the configuration.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any step fails, or an exception occurs.
 */
export async function setWheelMode(servoId) {
  checkConnection();
  let unlocked = false;
  try {
    console.log(`Setting servo ${servoId} to wheel mode...`);

    // 1. Unlock servo configuration
    const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      0
    );
    if (resUnlock !== COMM_SUCCESS) {
      throw new Error(
        `Failed to unlock servo ${servoId}: ${packetHandler.getTxRxResult(
          resUnlock
        )}, Error: ${errUnlock}`
      );
    }
    unlocked = true;

    // 2. Set mode to 1 (Wheel/Speed mode)
    const [resMode, errMode] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_MODE,
      1
    );
    if (resMode !== COMM_SUCCESS) {
      throw new Error(
        `Failed to set wheel mode for servo ${servoId}: ${packetHandler.getTxRxResult(
          resMode
        )}, Error: ${errMode}`
      );
    }

    // 3. Lock servo configuration
    const [resLock, errLock] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      1
    );
    if (resLock !== COMM_SUCCESS) {
      // Mode was set, but lock failed. Still an error state.
      throw new Error(
        `Failed to lock servo ${servoId} after setting mode: ${packetHandler.getTxRxResult(
          resLock
        )}, Error: ${errLock}`
      );
    }
    unlocked = false; // Successfully locked

    console.log(`Successfully set servo ${servoId} to wheel mode.`);
    return "success";
  } catch (err) {
    console.error(`Exception setting wheel mode for servo ${servoId}:`, err);
    if (unlocked) {
      // Attempt to re-lock if an error occurred after unlocking
      await tryLockServo(servoId);
    }
    // Re-throw the original error or a new one wrapping it
    throw new Error(
      `Failed to set wheel mode for servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Sets a servo back to position control mode from wheel mode.
 * Requires unlocking, setting mode, and locking the configuration.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any step fails, or an exception occurs.
 */
export async function setPositionMode(servoId) {
  checkConnection();
  let unlocked = false;
  try {
    console.log(`Setting servo ${servoId} back to position mode...`);

    // 1. Unlock servo configuration
    const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      0
    );
    if (resUnlock !== COMM_SUCCESS) {
      throw new Error(
        `Failed to unlock servo ${servoId}: ${packetHandler.getTxRxResult(
          resUnlock
        )}, Error: ${errUnlock}`
      );
    }
    unlocked = true;

    // 2. Set mode to 0 (Position/Servo mode)
    const [resMode, errMode] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_MODE,
      0 // 0 for position mode
    );
    if (resMode !== COMM_SUCCESS) {
      throw new Error(
        `Failed to set position mode for servo ${servoId}: ${packetHandler.getTxRxResult(
          resMode
        )}, Error: ${errMode}`
      );
    }

    // 3. Lock servo configuration
    const [resLock, errLock] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      1
    );
    if (resLock !== COMM_SUCCESS) {
      throw new Error(
        `Failed to lock servo ${servoId} after setting mode: ${packetHandler.getTxRxResult(
          resLock
        )}, Error: ${errLock}`
      );
    }
    unlocked = false; // Successfully locked

    console.log(`Successfully set servo ${servoId} back to position mode.`);
    return "success";
  } catch (err) {
    console.error(`Exception setting position mode for servo ${servoId}:`, err);
    if (unlocked) {
      // Attempt to re-lock if an error occurred after unlocking
      await tryLockServo(servoId);
    }
    throw new Error(
      `Failed to set position mode for servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Writes a target speed for a servo in wheel mode.
 * @param {number} servoId - The ID of the servo
 * @param {number} speed - The target speed value (-10000 to 10000). Negative values indicate reverse direction. 0 stops the wheel.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, either write fails, or an exception occurs.
 */
export async function writeWheelSpeed(servoId, speed) {
  checkConnection();
  try {
    // Validate and clamp the speed to the new range
    const clampedSpeed = Math.max(-10000, Math.min(10000, Math.round(speed)));
    let speedValue = Math.abs(clampedSpeed) & 0x7fff; // Get absolute value, ensure within 15 bits

    // Set the direction bit (MSB of the 16-bit value) if speed is negative
    if (clampedSpeed < 0) {
      speedValue |= 0x8000; // Set the 16th bit for reverse direction
    }

    // Use write2ByteTxRx to write the 16-bit speed value
    const [result, error] = await packetHandler.write2ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_GOAL_SPEED, // Starting address for the 2-byte speed value
      speedValue
    );

    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Error writing wheel speed to servo ${servoId}: ${packetHandler.getTxRxResult(
          result
        )}, Error: ${error}`
      );
    }

    return "success";
  } catch (err) {
    console.error(`Exception writing wheel speed to servo ${servoId}:`, err);
    throw new Error(
      `Exception writing wheel speed to servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Writes target speeds to multiple servos in wheel mode synchronously.
 * @param {Map<number, number> | object} servoSpeeds - A Map or object where keys are servo IDs (1-252) and values are target speeds (-10000 to 10000).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any speed is out of range, transmission fails, or an exception occurs.
 */
export async function syncWriteWheelSpeed(servoSpeeds) {
  checkConnection();

  const groupSyncWrite = new GroupSyncWrite(
    portHandler,
    packetHandler,
    ADDR_SCS_GOAL_SPEED,
    2 // Data length for speed (2 bytes)
  );
  let paramAdded = false;

  const entries =
    servoSpeeds instanceof Map
      ? servoSpeeds.entries()
      : Object.entries(servoSpeeds);

  // Second pass: Add valid parameters
  for (const [idStr, speed] of entries) {
    const servoId = parseInt(idStr, 10); // Already validated

    if (isNaN(servoId) || servoId < 1 || servoId > 252) {
      throw new Error(`Invalid servo ID "${idStr}" in syncWriteWheelSpeed.`);
    }
    if (speed < -10000 || speed > 10000) {
      throw new Error(
        `Invalid speed value ${speed} for servo ${servoId} in syncWriteWheelSpeed. Must be between -10000 and 10000.`
      );
    }

    const clampedSpeed = Math.max(-10000, Math.min(10000, Math.round(speed))); // Ensure integer, already validated range
    let speedValue = Math.abs(clampedSpeed) & 0x7fff; // Get absolute value, ensure within 15 bits

    // Set the direction bit (MSB of the 16-bit value) if speed is negative
    if (clampedSpeed < 0) {
      speedValue |= 0x8000; // Set the 16th bit for reverse direction
    }

    const data = [SCS_LOBYTE(speedValue), SCS_HIBYTE(speedValue)];

    if (groupSyncWrite.addParam(servoId, data)) {
      paramAdded = true;
    } else {
      // This should ideally not happen if IDs are unique, but handle defensively
      console.warn(
        `Failed to add servo ${servoId} to sync write speed group (possibly duplicate).`
      );
    }
  }

  if (!paramAdded) {
    console.log("Sync Write Speed: No valid servo speeds provided or added.");
    return "success"; // Nothing to write is considered success
  }

  try {
    // Send the Sync Write instruction
    const result = await groupSyncWrite.txPacket();
    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Sync Write Speed txPacket failed: ${packetHandler.getTxRxResult(
          result
        )}`
      );
    }
    return "success";
  } catch (err) {
    console.error("Exception during syncWriteWheelSpeed:", err);
    // Re-throw the original error or a new one wrapping it
    throw new Error(`Sync Write Speed failed: ${err.message}`);
  }
}

/**
 * Reads the current position of multiple servos synchronously.
 * @param {number[]} servoIds - An array of servo IDs (1-252) to read from.
 * @returns {Promise<Map<number, number>>} Resolves with a Map where keys are servo IDs and values are positions (1-4095).
 * @throws {Error} If not connected, transmission fails, reception fails, or data for any requested servo is unavailable.
 */
export async function syncReadPositions(servoIds) {
  checkConnection();
  if (!Array.isArray(servoIds) || servoIds.length === 0) {
    console.log("Sync Read: No servo IDs provided.");
    return new Map();
  }

  const startAddress = ADDR_SCS_PRESENT_POSITION;
  const dataLength = 2;
  const positions = new Map();

  for (const id of servoIds) {
    if (id < 1 || id > 252) {
      console.warn(`Sync Read: Invalid servo ID ${id} skipped.`);
      continue;
    }
    try {
      const [pos, result, error] = await packetHandler.read2ByteTxRx(
        portHandler,
        id,
        startAddress
      );
      if (result === COMM_SUCCESS) {
        positions.set(id, pos & 0xffff);
      } else {
        console.warn(
          `Sync Read: Failed to read position for servo ID ${id}: ${packetHandler.getTxRxResult(
            result
          )}, Error: ${error}`
        );
      }
    } catch (e) {
      console.warn(`Sync Read: Exception reading servo ID ${id}:`, e);
    }
  }

  return positions;
}

/**
 * Writes target positions to multiple servos synchronously.
 * @param {Map<number, number> | object} servoPositions - A Map or object where keys are servo IDs (1-252) and values are target positions (0-4095).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any position is out of range, transmission fails, or an exception occurs.
 */
export async function syncWritePositions(servoPositions) {
  checkConnection();

  const groupSyncWrite = new GroupSyncWrite(
    portHandler,
    packetHandler,
    ADDR_SCS_GOAL_POSITION,
    2 // Data length for position
  );
  let paramAdded = false;

  const entries =
    servoPositions instanceof Map
      ? servoPositions.entries()
      : Object.entries(servoPositions);

  // Second pass: Add valid parameters
  for (const [idStr, position] of entries) {
    const servoId = parseInt(idStr, 10); // Already validated
    if (isNaN(servoId) || servoId < 1 || servoId > 252) {
      throw new Error(`Invalid servo ID "${idStr}" in syncWritePositions.`);
    }
    if (position < 0 || position > 4095) {
      throw new Error(
        `Invalid position value ${position} for servo ${servoId} in syncWritePositions. Must be between 0 and 4095.`
      );
    }
    const targetPosition = Math.round(position); // Ensure integer, already validated range
    const data = [SCS_LOBYTE(targetPosition), SCS_HIBYTE(targetPosition)];

    if (groupSyncWrite.addParam(servoId, data)) {
      paramAdded = true;
    } else {
      // This should ideally not happen if IDs are unique, but handle defensively
      console.warn(
        `Failed to add servo ${servoId} to sync write group (possibly duplicate).`
      );
    }
  }

  if (!paramAdded) {
    console.log("Sync Write: No valid servo positions provided or added.");
    return "success"; // Nothing to write is considered success
  }

  try {
    // Send the Sync Write instruction
    const result = await groupSyncWrite.txPacket();
    if (result !== COMM_SUCCESS) {
      throw new Error(
        `Sync Write txPacket failed: ${packetHandler.getTxRxResult(result)}`
      );
    }
    return "success";
  } catch (err) {
    console.error("Exception during syncWritePositions:", err);
    // Re-throw the original error or a new one wrapping it
    throw new Error(`Sync Write failed: ${err.message}`);
  }
}

/**
 * Sets the Baud Rate of a servo.
 * NOTE: After changing the baud rate, you might need to disconnect and reconnect
 *       at the new baud rate to communicate with the servo further.
 * @param {number} servoId - The current ID of the servo to configure (1-252).
 * @param {number} baudRateIndex - The index representing the new baud rate (0-7).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, input is invalid, any step fails, or an exception occurs.
 */
export async function setBaudRate(servoId, baudRateIndex) {
  checkConnection();

  // Validate inputs
  if (servoId < 1 || servoId > 252) {
    throw new Error(
      `Invalid servo ID provided: ${servoId}. Must be between 1 and 252.`
    );
  }
  if (baudRateIndex < 0 || baudRateIndex > 7) {
    throw new Error(
      `Invalid baudRateIndex: ${baudRateIndex}. Must be between 0 and 7.`
    );
  }

  let unlocked = false;
  try {
    console.log(
      `Setting baud rate for servo ${servoId}: Index=${baudRateIndex}`
    );

    // 1. Unlock servo configuration
    const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      0 // 0 to unlock
    );
    if (resUnlock !== COMM_SUCCESS) {
      throw new Error(
        `Failed to unlock servo ${servoId}: ${packetHandler.getTxRxResult(
          resUnlock
        )}, Error: ${errUnlock}`
      );
    }
    unlocked = true;

    // 2. Write new Baud Rate index
    const [resBaud, errBaud] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_BAUD_RATE,
      baudRateIndex
    );
    if (resBaud !== COMM_SUCCESS) {
      throw new Error(
        `Failed to write baud rate index ${baudRateIndex} to servo ${servoId}: ${packetHandler.getTxRxResult(
          resBaud
        )}, Error: ${errBaud}`
      );
    }

    // 3. Lock servo configuration
    const [resLock, errLock] = await packetHandler.write1ByteTxRx(
      portHandler,
      servoId,
      ADDR_SCS_LOCK,
      1
    );
    if (resLock !== COMM_SUCCESS) {
      throw new Error(
        `Failed to lock servo ${servoId} after setting baud rate: ${packetHandler.getTxRxResult(
          resLock
        )}, Error: ${errLock}.`
      );
    }
    unlocked = false; // Successfully locked

    console.log(
      `Successfully set baud rate for servo ${servoId}. Index: ${baudRateIndex}. Remember to potentially reconnect with the new baud rate.`
    );
    return "success";
  } catch (err) {
    console.error(`Exception during setBaudRate for servo ID ${servoId}:`, err);
    if (unlocked) {
      await tryLockServo(servoId);
    }
    throw new Error(
      `Failed to set baud rate for servo ${servoId}: ${err.message}`
    );
  }
}

/**
 * Sets the ID of a servo.
 * NOTE: Changing the ID requires using the new ID for subsequent commands.
 * @param {number} currentServoId - The current ID of the servo to configure (1-252).
 * @param {number} newServoId - The new ID to set for the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, input is invalid, any step fails, or an exception occurs.
 */
export async function setServoId(currentServoId, newServoId) {
  checkConnection();

  // Validate inputs
  if (
    currentServoId < 1 ||
    currentServoId > 252 ||
    newServoId < 1 ||
    newServoId > 252
  ) {
    throw new Error(
      `Invalid servo ID provided. Current: ${currentServoId}, New: ${newServoId}. Must be between 1 and 252.`
    );
  }

  if (currentServoId === newServoId) {
    console.log(`Servo ID is already ${newServoId}. No change needed.`);
    return "success";
  }

  let unlocked = false;
  let idWritten = false;
  try {
    console.log(`Setting servo ID: From ${currentServoId} to ${newServoId}`);

    // 1. Unlock servo configuration (using current ID)
    const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(
      portHandler,
      currentServoId,
      ADDR_SCS_LOCK,
      0 // 0 to unlock
    );
    if (resUnlock !== COMM_SUCCESS) {
      throw new Error(
        `Failed to unlock servo ${currentServoId}: ${packetHandler.getTxRxResult(
          resUnlock
        )}, Error: ${errUnlock}`
      );
    }
    unlocked = true;

    // 2. Write new Servo ID (using current ID)
    const [resId, errId] = await packetHandler.write1ByteTxRx(
      portHandler,
      currentServoId,
      ADDR_SCS_ID,
      newServoId
    );
    if (resId !== COMM_SUCCESS) {
      throw new Error(
        `Failed to write new ID ${newServoId} to servo ${currentServoId}: ${packetHandler.getTxRxResult(
          resId
        )}, Error: ${errId}`
      );
    }
    idWritten = true;

    // 3. Lock servo configuration (using NEW ID)
    const [resLock, errLock] = await packetHandler.write1ByteTxRx(
      portHandler,
      newServoId, // Use NEW ID here
      ADDR_SCS_LOCK,
      1 // 1 to lock
    );
    if (resLock !== COMM_SUCCESS) {
      // ID was likely changed, but lock failed. Critical state.
      throw new Error(
        `Failed to lock servo with new ID ${newServoId}: ${packetHandler.getTxRxResult(
          resLock
        )}, Error: ${errLock}. Configuration might be incomplete.`
      );
    }
    unlocked = false; // Successfully locked with new ID

    console.log(
      `Successfully set servo ID from ${currentServoId} to ${newServoId}. Remember to use the new ID for future commands.`
    );
    return "success";
  } catch (err) {
    console.error(
      `Exception during setServoId for current ID ${currentServoId}:`,
      err
    );
    if (unlocked) {
      // If unlock succeeded but subsequent steps failed, attempt to re-lock.
      // If ID write failed, use current ID. If ID write succeeded but lock failed, use new ID.
      const idToLock = idWritten ? newServoId : currentServoId;
      console.warn(`Attempting to re-lock servo using ID ${idToLock}...`);
      await tryLockServo(idToLock);
    }
    throw new Error(
      `Failed to set servo ID from ${currentServoId} to ${newServoId}: ${err.message}`
    );
  }
}
