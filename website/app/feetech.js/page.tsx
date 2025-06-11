"use client";

import { useState, useRef, useEffect } from "react";
import { scsServoSDK } from "feetech.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FeetechPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [baudRate, setBaudRate] = useState(1000000);
  const [protocolEnd, setProtocolEnd] = useState(0);

  // Single servo control states
  const [servoId, setServoId] = useState(1);
  const [newId, setNewId] = useState(1);
  const [baudWrite, setBaudWrite] = useState(6);
  const [positionWrite, setPositionWrite] = useState(1000);
  const [accelerationWrite, setAccelerationWrite] = useState(50);
  const [wheelSpeedWrite, setWheelSpeedWrite] = useState(0);

  // Read results states
  const [readPosResult, setReadPosResult] = useState("");
  const [readBaudResult, setReadBaudResult] = useState("");

  // Sync operation states
  const [syncReadIds, setSyncReadIds] = useState("1,2,3");
  const [syncWriteData, setSyncWriteData] = useState("1:1500,2:2500");
  const [syncWriteSpeedData, setSyncWriteSpeedData] = useState("1:500,2:-1000");

  // Scan states
  const [scanStartId, setScanStartId] = useState(1);
  const [scanEndId, setScanEndId] = useState(15);
  const [scanResults, setScanResults] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Log states
  const [logs, setLogs] = useState<string[]>([]);
  const logOutputRef = useRef<HTMLPreElement>(null);

  const log = (message: string) => {
    console.log(message);
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs((prev) => [logEntry, ...prev.slice(0, 49)]); // Keep only last 50 logs
  };

  const updateConnectionStatus = (connected: boolean, message?: string) => {
    setIsConnected(connected);
    const statusMessage = message || (connected ? "Connected" : "Disconnected");
    setConnectionStatus(statusMessage);
    log(`Connection status: ${statusMessage}`);
  };

  const handleConnect = async () => {
    log("Attempting to connect...");
    try {
      await scsServoSDK.connect({ baudRate, protocolEnd });
      updateConnectionStatus(true, "Connected");
    } catch (err: any) {
      updateConnectionStatus(false, `Connection error: ${err.message}`);
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    log("Attempting to disconnect...");
    try {
      await scsServoSDK.disconnect();
      updateConnectionStatus(false, "Disconnected");
    } catch (err: any) {
      updateConnectionStatus(false, `Disconnection error: ${err.message}`);
      console.error(err);
    }
  };

  const handleWriteId = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    if (newId < 1 || newId > 252) {
      log(`Error: Invalid new ID ${newId}. Must be between 1 and 252.`);
      return;
    }
    log(`Writing new ID ${newId} to servo ${servoId}...`);
    try {
      await scsServoSDK.setServoId(servoId, newId);
      log(`Successfully wrote new ID ${newId} to servo (was ${servoId}).`);
      setServoId(newId);
      log(`Servo ID input field updated to ${newId}.`);
    } catch (err: any) {
      log(`Error writing ID for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleReadBaud = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Reading Baud Rate Index for servo ${servoId}...`);
    setReadBaudResult("Reading...");
    try {
      const baudRateIndex = await scsServoSDK.readBaudRate(servoId);
      setReadBaudResult(`Baud Index: ${baudRateIndex}`);
      log(`Servo ${servoId} Baud Rate Index: ${baudRateIndex}`);
    } catch (err: any) {
      setReadBaudResult(`Error: ${err.message}`);
      log(`Error reading Baud Rate Index for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleWriteBaud = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    if (baudWrite < 0 || baudWrite > 7) {
      log(
        `Error: Invalid new Baud Rate Index ${baudWrite}. Check valid range.`
      );
      return;
    }
    log(`Writing new Baud Rate Index ${baudWrite} to servo ${servoId}...`);
    try {
      await scsServoSDK.setBaudRate(servoId, baudWrite);
      log(
        `Successfully wrote new Baud Rate Index ${baudWrite} to servo ${servoId}.`
      );
      log(
        `IMPORTANT: You may need to disconnect and reconnect with the new baud rate if it differs from the current connection baud rate.`
      );
    } catch (err: any) {
      log(`Error writing Baud Rate Index for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleReadPosition = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Reading position for servo ${servoId}...`);
    setReadPosResult("Reading...");
    try {
      const position = await scsServoSDK.readPosition(servoId);
      setReadPosResult(`Position: ${position}`);
      log(`Servo ${servoId} position: ${position}`);
    } catch (err: any) {
      setReadPosResult(`Error: ${err.message}`);
      log(`Error reading position for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleWritePosition = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Writing position ${positionWrite} to servo ${servoId}...`);
    try {
      await scsServoSDK.writePosition(servoId, positionWrite);
      log(`Successfully wrote position ${positionWrite} to servo ${servoId}.`);
    } catch (err: any) {
      log(`Error writing position for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleTorqueEnable = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Enabling torque for servo ${servoId}...`);
    try {
      await scsServoSDK.writeTorqueEnable(servoId, true);
      log(`Successfully enabled torque for servo ${servoId}.`);
    } catch (err: any) {
      log(`Error enabling torque for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleTorqueDisable = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Disabling torque for servo ${servoId}...`);
    try {
      await scsServoSDK.writeTorqueEnable(servoId, false);
      log(`Successfully disabled torque for servo ${servoId}.`);
    } catch (err: any) {
      log(`Error disabling torque for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleWriteAcceleration = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Writing acceleration ${accelerationWrite} to servo ${servoId}...`);
    try {
      await scsServoSDK.writeAcceleration(servoId, accelerationWrite);
      log(
        `Successfully wrote acceleration ${accelerationWrite} to servo ${servoId}.`
      );
    } catch (err: any) {
      log(`Error writing acceleration for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleSetWheelMode = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Setting servo ${servoId} to wheel mode...`);
    try {
      await scsServoSDK.setWheelMode(servoId);
      log(`Successfully set servo ${servoId} to wheel mode.`);
    } catch (err: any) {
      log(`Error setting wheel mode for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleSetPositionMode = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Setting servo ${servoId} back to position mode...`);
    try {
      await scsServoSDK.setPositionMode(servoId);
      log(`Successfully set servo ${servoId} back to position mode.`);
    } catch (err: any) {
      log(`Error setting position mode for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleWriteWheelSpeed = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Writing wheel speed ${wheelSpeedWrite} to servo ${servoId}...`);
    try {
      await scsServoSDK.writeWheelSpeed(servoId, wheelSpeedWrite);
      log(
        `Successfully wrote wheel speed ${wheelSpeedWrite} to servo ${servoId}.`
      );
    } catch (err: any) {
      log(`Error writing wheel speed for servo ${servoId}: ${err.message}`);
      console.error(err);
    }
  };

  const handleSyncRead = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    const ids = syncReadIds
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0 && id < 253);
    if (ids.length === 0) {
      log("Sync Read: No valid servo IDs provided.");
      return;
    }
    log(`Sync reading positions for servos: ${ids.join(", ")}...`);
    try {
      const positions = await scsServoSDK.syncReadPositions(ids);
      let logMsg = "Sync Read Successful:\n";
      positions.forEach((pos, id) => {
        logMsg += `  Servo ${id}: Position=${pos}\n`;
      });
      log(logMsg.trim());
    } catch (err: any) {
      log(`Sync Read Failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleSyncWrite = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    const positionMap = new Map();
    const pairs = syncWriteData.split(",");
    let validData = false;

    pairs.forEach((pair) => {
      const parts = pair.split(":");
      if (parts.length === 2) {
        const id = parseInt(parts[0].trim(), 10);
        const pos = parseInt(parts[1].trim(), 10);
        if (
          !isNaN(id) &&
          id > 0 &&
          id < 253 &&
          !isNaN(pos) &&
          pos >= 0 &&
          pos <= 4095
        ) {
          positionMap.set(id, pos);
          validData = true;
        } else {
          log(`Sync Write Position: Invalid data "${pair}". Skipping.`);
        }
      } else {
        log(`Sync Write Position: Invalid format "${pair}". Skipping.`);
      }
    });

    if (!validData) {
      log("Sync Write Position: No valid servo position data provided.");
      return;
    }

    log(
      `Sync writing positions: ${Array.from(positionMap.entries())
        .map(([id, pos]) => `${id}:${pos}`)
        .join(", ")}...`
    );
    try {
      await scsServoSDK.syncWritePositions(positionMap);
      log(`Sync write position command sent successfully.`);
    } catch (err: any) {
      log(`Sync Write Position Failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleSyncWriteSpeed = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    const speedMap = new Map();
    const pairs = syncWriteSpeedData.split(",");
    let validData = false;

    pairs.forEach((pair) => {
      const parts = pair.split(":");
      if (parts.length === 2) {
        const id = parseInt(parts[0].trim(), 10);
        const speed = parseInt(parts[1].trim(), 10);
        if (
          !isNaN(id) &&
          id > 0 &&
          id < 253 &&
          !isNaN(speed) &&
          speed >= -10000 &&
          speed <= 10000
        ) {
          speedMap.set(id, speed);
          validData = true;
        } else {
          log(`Sync Write Speed: Invalid data "${pair}". Skipping.`);
        }
      } else {
        log(`Sync Write Speed: Invalid format "${pair}". Skipping.`);
      }
    });

    if (!validData) {
      log("Sync Write Speed: No valid servo speed data provided.");
      return;
    }

    log(
      `Sync writing speeds: ${Array.from(speedMap.entries())
        .map(([id, speed]) => `${id}:${speed}`)
        .join(", ")}...`
    );
    try {
      await scsServoSDK.syncWriteWheelSpeed(speedMap);
      log(`Sync write speed command sent successfully.`);
    } catch (err: any) {
      log(`Sync Write Speed Failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleScanServos = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }

    if (scanStartId < 1 || scanEndId > 252 || scanStartId > scanEndId) {
      const errorMsg =
        "Error: Invalid scan ID range. Please enter values between 1 and 252, with Start ID <= End ID.";
      log(errorMsg);
      setScanResults(errorMsg);
      return;
    }

    const startMsg = `Starting servo scan (IDs ${scanStartId}-${scanEndId})...`;
    log(startMsg);
    setScanResults(startMsg + "\n");
    setIsScanning(true);

    let foundCount = 0;
    let results = startMsg + "\n";

    for (let id = scanStartId; id <= scanEndId; id++) {
      let resultMsg = `Scanning ID ${id}... `;
      try {
        const position = await scsServoSDK.readPosition(id);
        foundCount++;

        let mode = "ReadError";
        let baudRateIndex = "ReadError";
        try {
          mode = await scsServoSDK.readMode(id);
        } catch (modeErr: any) {
          log(
            `    Warning: Could not read mode for servo ${id}: ${modeErr.message}`
          );
        }
        try {
          baudRateIndex = await scsServoSDK.readBaudRate(id);
        } catch (baudErr: any) {
          log(
            `    Warning: Could not read baud rate for servo ${id}: ${baudErr.message}`
          );
        }

        resultMsg += `FOUND: Pos=${position}, Mode=${mode}, BaudIdx=${baudRateIndex}`;
        log(
          `  Servo ${id} FOUND: Position=${position}, Mode=${mode}, BaudIndex=${baudRateIndex}`
        );
      } catch (err: any) {
        if (
          err.message.includes("timeout") ||
          err.message.includes("No response") ||
          err.message.includes("failed: RX")
        ) {
          // Expected for non-existent servos
        } else {
          resultMsg += `ERROR: ${err.message}`;
          log(`  Servo ${id}: Unexpected error - ${err.message}`);
        }
      }
      results += resultMsg + "\n";
      setScanResults(results);
    }

    const finishMsg = `Servo scan finished. Found ${foundCount} servo(s).`;
    log(finishMsg);
    results += finishMsg + "\n";
    setScanResults(results);
    setIsScanning(false);
  };

  useEffect(() => {
    log("Test page loaded. Please connect to a servo controller.");
  }, []);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6 mt-20 bg-zinc-800 text-white rounded-xl">
      <h1 className="text-3xl font-bold mb-6">Feetech Servo Test Page</h1>

      
      <div className="border border-gray-300 rounded-lg p-4 bg-zinc-700">
        <h2 className="text-lg font-semibold mb-3">Documentation & Source</h2>
        <div className="space-y-2">
          <p className="text-sm">
            This page demonstrates the capabilities of <strong>feetech.js</strong>, a JavaScript library for controlling Feetech servo motors. (Currently tested on STS3215 servos)
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a 
              href="https://github.com/timqian/bambot/tree/main/feetech.js" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              🛠️ Source Code
            </a>
            <a 
              href="https://deepwiki.com/timqian/bambot/4.1-feetech.js-sdk"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              📚 Documentation
            </a>
            <a
              href="https://www.npmjs.com/package/feetech.js"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              📦 npm package
            </a>
          </div>
        </div>
      </div>

      {/* Key Concepts Section */}
      <details className="border border-gray-300 rounded-lg p-4">
        <summary className="font-semibold cursor-pointer mb-2">
          Key Concepts
        </summary>
        <div className="space-y-2">
          <p>
        Understanding these parameters is crucial for controlling Feetech servos:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
        <li>
          <strong>Mode:</strong> Determines the servo's primary function.
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>
          <code className="bg-gray-600 px-1 rounded">Mode 0</code>: Position/Servo Mode. The servo moves to and holds a specific angular position.
            </li>
            <li>
          <code className="bg-gray-600 px-1 rounded">Mode 1</code>: Wheel/Speed Mode. The servo rotates continuously at a specified speed and direction, like a motor.
            </li>
          </ul>
          <p className="text-xs mt-1">
            Changing the mode requires unlocking, writing the mode value (0 or 1), and locking the configuration.
          </p>
        </li>
        <li>
          <strong>Position:</strong> In Position Mode (Mode 0), this value represents the target or current angular position of the servo's output shaft.
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>
          Range: Typically <code className="bg-gray-600 px-1 rounded">0</code> to <code className="bg-gray-600 px-1 rounded">4095</code> (representing a 12-bit resolution).
            </li>
            <li>
          Meaning: Corresponds to the servo's rotational range (e.g., 0-360 degrees or 0-270 degrees, depending on the specific servo model). <code className="bg-gray-600 px-1 rounded">0</code> is one end of the range, <code className="bg-gray-600 px-1 rounded">4095</code> is the other.
            </li>
          </ul>
        </li>
        <li>
          <strong>Speed (Wheel Mode):</strong> In Wheel Mode (Mode 1), this value controls the rotational speed and direction.
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>
          Range: Typically <code className="bg-gray-600 px-1 rounded">-2500</code> to <code className="bg-gray-600 px-1 rounded">+2500</code>. (Note: Some documentation might mention -1023 to +1023, but the SDK example uses a wider range).
            </li>
            <li>
          Meaning: <code className="bg-gray-600 px-1 rounded">0</code> stops the wheel. Positive values rotate in one direction (e.g., clockwise), negative values rotate in the opposite direction (e.g., counter-clockwise). The magnitude determines the speed (larger absolute value means faster rotation).
            </li>
            <li>
          Control Address: <code className="bg-gray-600 px-1 rounded">ADDR_SCS_GOAL_SPEED</code> (Register 46/47).
            </li>
          </ul>
        </li>
        <li>
          <strong>Acceleration:</strong> Controls how quickly the servo changes speed to reach its target position (in Position Mode) or target speed (in Wheel Mode).
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>
          Range: Typically <code className="bg-gray-600 px-1 rounded">0</code> to <code className="bg-gray-600 px-1 rounded">254</code>.
            </li>
            <li>
          Meaning: Defines the rate of change of speed. The unit is 100 steps/s². <code className="bg-gray-600 px-1 rounded">0</code> usually means instantaneous acceleration (or minimal delay). Higher values result in slower, smoother acceleration and deceleration. For example, a value of <code className="bg-gray-600 px-1 rounded">10</code> means the speed changes by 10 * 100 = 1000 steps per second, per second. This helps reduce jerky movements and mechanical stress.
            </li>
            <li>
          Control Address: <code className="bg-gray-600 px-1 rounded">ADDR_SCS_GOAL_ACC</code> (Register 41).
            </li>
          </ul>
        </li>
        <li>
          <strong>Baud Rate:</strong> The speed of communication between the controller and the servo. It must match on both ends. Servos often support multiple baud rates, selectable via an index:
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>Index 0: 1,000,000 bps</li>
            <li>Index 1: 500,000 bps</li>
            <li>Index 2: 250,000 bps</li>
            <li>Index 3: 128,000 bps</li>
            <li>Index 4: 115,200 bps</li>
            <li>Index 5: 76,800 bps</li>
            <li>Index 6: 57,600 bps</li>
            <li>Index 7: 38,400 bps</li>
          </ul>
        </li>
          </ul>
        </div>
      </details>

      {/* Connection Section */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Connection</h2>
        <div className="flex gap-2 mb-4">
          <Button onClick={handleConnect} disabled={isConnected}>
            Connect
          </Button>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            disabled={!isConnected}
          >
            Disconnect
          </Button>
        </div>
        <p className="mb-4">
          Status:{" "}
          <span
            className={`font-bold ${
              isConnected ? "text-green-600" : "text-red-600"
            }`}
          >
            {connectionStatus}
          </span>
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="baudRate"
              className="text-sm font-medium min-w-[100px]"
            >
              Baud Rate:
            </label>
            <Input
              id="baudRate"
              type="number"
              value={baudRate}
              onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
              className="w-32 bg-zinc-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="protocolEnd"
              className="text-sm font-medium min-w-[180px]"
            >
              Protocol End (0=STS/SMS, 1=SCS):
            </label>
            <Input
              id="protocolEnd"
              type="number"
              value={protocolEnd}
              onChange={(e) => setProtocolEnd(parseInt(e.target.value, 10))}
              min="0"
              max="1"
              className="w-20 bg-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Scan Servos Section */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Scan Servos</h2>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="scanStartId"
              className="text-sm font-medium min-w-[70px]"
            >
              Start ID:
            </label>
            <Input
              id="scanStartId"
              type="number"
              value={scanStartId}
              onChange={(e) => setScanStartId(parseInt(e.target.value, 10))}
              min="1"
              max="252"
              className="w-20 bg-zinc-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="scanEndId"
              className="text-sm font-medium min-w-[60px]"
            >
              End ID:
            </label>
            <Input
              id="scanEndId"
              type="number"
              value={scanEndId}
              onChange={(e) => setScanEndId(parseInt(e.target.value, 10))}
              min="1"
              max="252"
              className="w-20 bg-zinc-700"
            />
          </div>
          <Button
            onClick={handleScanServos}
            disabled={!isConnected || isScanning}
          >
            {isScanning ? "Scanning..." : "Scan"}
          </Button>
        </div>
        <p className="text-sm font-medium mb-2">Scan Results:</p>
        <pre className="bg-gray-600 p-3 rounded border text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
          {scanResults}
        </pre>
      </div>

      {/* Single Servo Control Section */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Single Servo Control</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="servoId"
              className="text-sm font-medium min-w-[80px]"
            >
              Servo ID:
            </label>
            <Input
              id="servoId"
              type="number"
              value={servoId}
              onChange={(e) => setServoId(parseInt(e.target.value, 10))}
              min="1"
              max="252"
              className="w-20 bg-zinc-700"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="idWrite"
              className="text-sm font-medium min-w-[130px]"
            >
              Change servo ID:
            </label>
            <Input
              id="idWrite"
              type="number"
              value={newId}
              onChange={(e) => setNewId(parseInt(e.target.value, 10))}
              min="1"
              max="252"
              className="w-20 bg-zinc-700"
            />
            <Button onClick={handleWriteId} size="sm">
              Write
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-sm font-medium min-w-[130px]">
              Read Baud Rate:
            </label>
            <Button onClick={handleReadBaud} size="sm">
              Read
            </Button>
            <span className="text-sm">{readBaudResult}</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="baudWrite"
              className="text-sm font-medium min-w-[160px]"
            >
              Write Baud Rate Index:
            </label>
            <Input
              id="baudWrite"
              type="number"
              value={baudWrite}
              onChange={(e) => setBaudWrite(parseInt(e.target.value, 10))}
              min="0"
              max="7"
              className="w-20 bg-zinc-700"
            />
            <Button onClick={handleWriteBaud} size="sm">
              Write
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-sm font-medium min-w-[130px]">
              Read Position:
            </label>
            <Button onClick={handleReadPosition} size="sm">
              Read
            </Button>
            <span className="text-sm">{readPosResult}</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="positionWrite"
              className="text-sm font-medium min-w-[130px]"
            >
              Write Position:
            </label>
            <Input
              id="positionWrite"
              type="number"
              value={positionWrite}
              onChange={(e) => setPositionWrite(parseInt(e.target.value, 10))}
              min="0"
              max="4095"
              className="w-20 bg-zinc-700"
            />
            <Button onClick={handleWritePosition} size="sm">
              Write
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-sm font-medium min-w-[80px]">Torque:</label>
            <Button onClick={handleTorqueEnable} size="sm">
              Enable
            </Button>
            <Button onClick={handleTorqueDisable} size="sm">
              Disable
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="accelerationWrite"
              className="text-sm font-medium min-w-[150px]"
            >
              Write Acceleration:
            </label>
            <Input
              id="accelerationWrite"
              type="number"
              value={accelerationWrite}
              onChange={(e) =>
                setAccelerationWrite(parseInt(e.target.value, 10))
              }
              min="0"
              max="254"
              className="w-20 bg-zinc-700"
            />
            <Button onClick={handleWriteAcceleration} size="sm">
              Write
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-sm font-medium min-w-[100px]">
              Wheel Mode:
            </label>
            <Button onClick={handleSetWheelMode} size="sm">
              Set Wheel Mode
            </Button>
            <Button onClick={handleSetPositionMode} size="sm">
              Set Position Mode
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="wheelSpeedWrite"
              className="text-sm font-medium min-w-[150px]"
            >
              Write Wheel Speed:
            </label>
            <Input
              id="wheelSpeedWrite"
              type="number"
              value={wheelSpeedWrite}
              onChange={(e) => setWheelSpeedWrite(parseInt(e.target.value, 10))}
              min="-2500"
              max="2500"
              className="w-24 bg-zinc-700"
            />
            <Button onClick={handleWriteWheelSpeed} size="sm">
              Write Speed
            </Button>
          </div>
        </div>
      </div>

      {/* Sync Operations Section */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Sync Operations</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="syncWriteData"
              className="text-sm font-medium min-w-[160px]"
            >
              Sync Write (id:pos,...):
            </label>
            <Input
              id="syncWriteData"
              type="text"
              value={syncWriteData}
              onChange={(e) => setSyncWriteData(e.target.value)}
              className="w-48 bg-zinc-700"
            />
            <Button onClick={handleSyncWrite} size="sm">
              Sync Write Positions
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label
              htmlFor="syncWriteSpeedData"
              className="text-sm font-medium min-w-[180px]"
            >
              Sync Write Speed (id:speed,...):
            </label>
            <Input
              id="syncWriteSpeedData"
              type="text"
              value={syncWriteSpeedData}
              onChange={(e) => setSyncWriteSpeedData(e.target.value)}
              className="w-48 bg-zinc-700"
            />
            <Button onClick={handleSyncWriteSpeed} size="sm">
              Sync Write Speeds
            </Button>
          </div>
        </div>
      </div>

      {/* Log Output Section */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Log Output</h2>
        <pre
          ref={logOutputRef}
          className="bg-gray-600 p-3 rounded border text-xs max-h-64 overflow-y-auto whitespace-pre-wrap"
        >
          {logs.join("\n")}
        </pre>
      </div>
    </div>
  );
}
