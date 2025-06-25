"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ScsServoSDK } from "feetech.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const scsServoSDK = new ScsServoSDK();

// Translation object
const translations = {
  en: {
    title: "Feetech Servo Control Panel",
    subtitle: "Config and debug your Feetech servos with ease",
    documentation: "📚 Documentation & Source",
    docDescription:
      "This page demonstrates the capabilities of feetech.js, a JavaScript library for controlling Feetech servo motors. (Currently tested on STS3215 servos)",
    sourceCode: "🛠️ Source Code",
    npmPackage: "📦 npm package",
    keyConcepts: "💡 Key Concepts - Click to expand",
    connection: "🔌 Connection",
    baudRate: "Baud Rate",
    protocolEnd: "Protocol End",
    protocolEndNote: "(0=STS/SMS, 1=SCS)",
    connect: "Connect",
    disconnect: "Disconnect",
    status: "Status:",
    connected: "Connected",
    disconnected: "Disconnected",
    scanServos: "🔍 Scan Servos",
    startId: "Start ID",
    endId: "End ID",
    startScan: "Start Scan",
    scanning: "Scanning...",
    scanResults: "Scan Results",
    noScanResults: "No scan results yet...",
    singleServoControl: "🎛️ Single Servo Control",
    currentServoId: "Current Servo ID",
    idManagement: "ID Management",
    changeId: "Change ID",
    readBaud: "Read Baud",
    positionControl: "Position Control",
    readPosition: "Read Position",
    torqueControl: "Torque Control",
    enableTorque: "Enable Torque",
    disableTorque: "Disable Torque",
    acceleration: "Acceleration",
    setAcceleration: "Set Acceleration",
    modeControl: "Mode Control",
    wheelMode: "Wheel Mode",
    positionMode: "Position Mode",
    wheelSpeed: "Wheel Speed",
    setSpeed: "Set Speed",
    syncOperations: "🔄 Sync Operations (batch operations)",
    syncWritePositions: "Sync Write Positions",
    syncWriteSpeeds: "Sync Write Speeds",
    syncReadPositions: "Sync Read Positions",
    syncReadPositionsPlaceholder: "1,2,3",
    syncReadPositionsButton: "Sync Read Positions",
    syncReadPositionsResult: "Positions",
    logOutput: "📋 Log Output",
    logsWillAppear: "Logs will appear here...",
    language: "Language",
    editThisPage: "✏️ Edit this page",
    editDescription:
      "Found an issue or want to improve this page? Edit it on GitHub!",
  },
  zh: {
    title: "飞特舵机控制面板",
    subtitle: "轻松配置和调试您的飞特舵机",
    documentation: "📚 文档和源码",
    docDescription:
      "此页面展示了 feetech.js 的功能，这是一个用于控制飞特舵机的 JavaScript 库。（目前在 STS3215 舵机上测试）",
    sourceCode: "🛠️ 源代码",
    npmPackage: "📦 npm 包",
    keyConcepts: "💡 核心概念 - 点击展开",
    connection: "🔌 连接",
    baudRate: "波特率",
    protocolEnd: "协议端",
    protocolEndNote: "(0=STS/SMS, 1=SCS)",
    connect: "连接",
    disconnect: "断开连接",
    status: "状态：",
    connected: "已连接",
    disconnected: "已断开",
    scanServos: "🔍 扫描舵机",
    startId: "起始 ID",
    endId: "结束 ID",
    startScan: "开始扫描",
    scanning: "扫描中...",
    scanResults: "扫描结果",
    noScanResults: "暂无扫描结果...",
    singleServoControl: "🎛️ 单个舵机控制",
    currentServoId: "当前舵机 ID",
    idManagement: "ID 管理",
    changeId: "更改 ID",
    readBaud: "读取波特率",
    positionControl: "位置控制",
    readPosition: "读取位置",
    torqueControl: "扭矩控制",
    enableTorque: "启用扭矩",
    disableTorque: "禁用扭矩",
    acceleration: "加速度",
    setAcceleration: "设置加速度",
    modeControl: "模式控制",
    wheelMode: "轮子模式",
    positionMode: "位置模式",
    wheelSpeed: "轮子速度",
    setSpeed: "设置速度",
    syncOperations: "🔄 同步操作（批量操作）",
    syncWritePositions: "同步写入位置",
    syncWriteSpeeds: "同步写入速度",
    syncReadPositions: "同步读取位置",
    syncReadPositionsPlaceholder: "1,2,3",
    syncReadPositionsButton: "同步读取位置",
    syncReadPositionsResult: "位置",
    logOutput: "📋 日志输出",
    logsWillAppear: "日志将在此处显示...",
    language: "语言",
    editThisPage: "✏️ 编辑此页面",
    editDescription: "发现问题或想改进此页面？在 GitHub 上编辑它！",
  },
};

function FeetechPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Language state with URL control
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const t = translations[language];

  // Initialize language from URL
  useEffect(() => {
    const urlLang = searchParams.get("lang");
    if (urlLang === "zh" || urlLang === "en") {
      setLanguage(urlLang);
    }
  }, [searchParams]);

  // Handle language change with URL update
  const handleLanguageChange = (newLang: "en" | "zh") => {
    setLanguage(newLang);
    const params = new URLSearchParams(searchParams);
    params.set("lang", newLang);
    router.push(`?${params.toString()}`);
  };

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [baudRate, setBaudRate] = useState(1000000);
  const [protocolEnd, setProtocolEnd] = useState(0);

  // Single servo control states
  const [servoId, setServoId] = useState(1);
  const [newId, setNewId] = useState(1);
  const [baudWrite, setBaudWrite] = useState(0);
  const [positionWrite, setPositionWrite] = useState(1000);
  const [accelerationWrite, setAccelerationWrite] = useState(50);
  const [wheelSpeedWrite, setWheelSpeedWrite] = useState(0);

  // Read results states
  const [readPosResult, setReadPosResult] = useState("");
  const [readBaudResult, setReadBaudResult] = useState("");
  const [torqueResult, setTorqueResult] = useState("");
  const [modeResult, setModeResult] = useState("");
  const [accelerationResult, setAccelerationResult] = useState("");
  const [wheelSpeedResult, setWheelSpeedResult] = useState("");
  const [idChangeResult, setIdChangeResult] = useState("");

  // Sync operation states
  const [syncWriteData, setSyncWriteData] = useState("1:1500,2:2500");
  const [syncWriteSpeedData, setSyncWriteSpeedData] = useState("1:500,2:-1000");
  // Add sync read positions state
  const [syncReadIds, setSyncReadIds] = useState("1,2");
  const [syncReadPositionsResult, setSyncReadPositionsResult] = useState("");

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
      setIdChangeResult(`Error: Invalid ID ${newId}`);
      return;
    }
    log(`Writing new ID ${newId} to servo ${servoId}...`);
    setIdChangeResult("Changing ID...");
    try {
      await scsServoSDK.setServoId(servoId, newId);
      log(`Successfully wrote new ID ${newId} to servo (was ${servoId}).`);
      setIdChangeResult(`Success: ID changed to ${newId}`);
      setServoId(newId);
      log(`Servo ID input field updated to ${newId}.`);
    } catch (err: any) {
      log(`Error writing ID for servo ${servoId}: ${err.message}`);
      setIdChangeResult(`Error: ${err.message}`);
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
    setTorqueResult("Enabling torque...");
    try {
      await scsServoSDK.writeTorqueEnable(servoId, true);
      log(`Successfully enabled torque for servo ${servoId}.`);
      setTorqueResult(`Success: Torque enabled`);
    } catch (err: any) {
      log(`Error enabling torque for servo ${servoId}: ${err.message}`);
      setTorqueResult(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const handleTorqueDisable = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Disabling torque for servo ${servoId}...`);
    setTorqueResult("Disabling torque...");
    try {
      await scsServoSDK.writeTorqueEnable(servoId, false);
      log(`Successfully disabled torque for servo ${servoId}.`);
      setTorqueResult(`Success: Torque disabled`);
    } catch (err: any) {
      log(`Error disabling torque for servo ${servoId}: ${err.message}`);
      setTorqueResult(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const handleWriteAcceleration = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Writing acceleration ${accelerationWrite} to servo ${servoId}...`);
    setAccelerationResult("Setting acceleration...");
    try {
      await scsServoSDK.writeAcceleration(servoId, accelerationWrite);
      log(
        `Successfully wrote acceleration ${accelerationWrite} to servo ${servoId}.`
      );
      setAccelerationResult(
        `Success: Acceleration set to ${accelerationWrite}`
      );
    } catch (err: any) {
      log(`Error writing acceleration for servo ${servoId}: ${err.message}`);
      setAccelerationResult(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const handleSetWheelMode = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Setting servo ${servoId} to wheel mode...`);
    setModeResult("Setting wheel mode...");
    try {
      await scsServoSDK.setWheelMode(servoId);
      log(`Successfully set servo ${servoId} to wheel mode.`);
      setModeResult(`Success: Wheel mode enabled`);
    } catch (err: any) {
      log(`Error setting wheel mode for servo ${servoId}: ${err.message}`);
      setModeResult(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const handleSetPositionMode = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Setting servo ${servoId} back to position mode...`);
    setModeResult("Setting position mode...");
    try {
      await scsServoSDK.setPositionMode(servoId);
      log(`Successfully set servo ${servoId} back to position mode.`);
      setModeResult(`Success: Position mode enabled`);
    } catch (err: any) {
      log(`Error setting position mode for servo ${servoId}: ${err.message}`);
      setModeResult(`Error: ${err.message}`);
      console.error(err);
    }
  };

  const handleWriteWheelSpeed = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    log(`Writing wheel speed ${wheelSpeedWrite} to servo ${servoId}...`);
    setWheelSpeedResult("Setting wheel speed...");
    try {
      await scsServoSDK.writeWheelSpeed(servoId, wheelSpeedWrite);
      log(
        `Successfully wrote wheel speed ${wheelSpeedWrite} to servo ${servoId}.`
      );
      setWheelSpeedResult(`Success: Speed set to ${wheelSpeedWrite}`);
    } catch (err: any) {
      log(`Error writing wheel speed for servo ${servoId}: ${err.message}`);
      setWheelSpeedResult(`Error: ${err.message}`);
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

  const handleSyncReadPositions = async () => {
    if (!isConnected) {
      log("Error: Not connected");
      return;
    }
    const ids = syncReadIds
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0 && id < 253);
    if (ids.length === 0) {
      log("Sync Read Positions: No valid IDs provided.");
      setSyncReadPositionsResult("No valid IDs provided.");
      return;
    }
    log(`Sync reading positions for IDs: ${ids.join(", ")}`);
    setSyncReadPositionsResult("Reading...");
    try {
      // Try to use SDK batch read if available, else fallback to sequential
      const positions = await scsServoSDK.syncReadPositions(ids);
      let logMsg = "";
      positions.forEach((pos, id) => {
        logMsg += `  Servo ${id}: Position=${pos}\n`;
      });

      setSyncReadPositionsResult(logMsg);
      log(`Sync Read Positions Result:\n${logMsg}`);
    } catch (err: any) {
      setSyncReadPositionsResult(`Error: ${err.message}`);
      log(`Sync Read Positions Failed: ${err.message}`);
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

  // Available baud rates mapping
  const baudRateOptions = [
    { index: 0, rate: 1000000, label: "1,000,000 bps (Index 0)" },
    { index: 1, rate: 500000, label: "500,000 bps (Index 1)" },
    { index: 2, rate: 250000, label: "250,000 bps (Index 2)" },
    { index: 3, rate: 128000, label: "128,000 bps (Index 3)" },
    { index: 4, rate: 115200, label: "115,200 bps (Index 4)" },
    { index: 5, rate: 76800, label: "76,800 bps (Index 5)" },
    { index: 6, rate: 57600, label: "57,600 bps (Index 6)" },
    { index: 7, rate: 38400, label: "38,400 bps (Index 7)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800 py-8 pt-20">
      <div className="container mx-auto max-w-4xl px-4 space-y-8">
        {/* Header with Language Selector */}
        <div className="text-center mb-12">
          <div className="flex justify-end mb-4">
            <select
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as "en" | "zh")
              }
              className="px-3 py-1 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-zinc-400 text-lg">{t.subtitle}</p>
        </div>

        {/* Documentation Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            {t.documentation}
          </h2>
          <div className="space-y-4">
            <p className="text-zinc-300">{t.docDescription}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://github.com/timqian/bambot/tree/main/feetech.js"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors border border-zinc-600"
              >
                <span className="text-blue-400 hover:text-blue-300">
                  {t.sourceCode}
                </span>
              </a>
              <a
                href="https://deepwiki.com/timqian/bambot/4.1-feetech.js-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors border border-zinc-600"
              >
                <span>📚</span>
                <span className="text-blue-400 hover:text-blue-300">
                  Documentation
                </span>
              </a>
              <a
                href="https://www.npmjs.com/package/feetech.js"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors border border-zinc-600"
              >
                <span className="text-blue-400 hover:text-blue-300">
                  {t.npmPackage}
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Key Concepts Section */}
        <details className="bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg">
          <summary className="p-6 font-semibold cursor-pointer text-white hover:bg-zinc-750 rounded-xl transition-colors">
            {t.keyConcepts}
          </summary>
          <div className="px-6 pb-6 space-y-4 text-zinc-300">
            <p>
              {language === "zh"
                ? "理解这些参数对于控制飞特舵机至关重要："
                : "Understanding these parameters is crucial for controlling Feetech servos:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>{language === "zh" ? "模式：" : "Mode:"}</strong>
                {language === "zh"
                  ? "决定舵机的主要功能。"
                  : "Determines the servo's primary function."}
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    <code className="bg-gray-600 px-1 rounded">Mode 0</code>:
                    {language === "zh"
                      ? "位置/舵机模式。舵机移动到特定角度位置并保持。"
                      : "Position/Servo Mode. The servo moves to and holds a specific angular position."}
                  </li>
                  <li>
                    <code className="bg-gray-600 px-1 rounded">Mode 1</code>:
                    {language === "zh"
                      ? "轮子/速度模式。舵机以指定的速度和方向连续旋转，类似电机。"
                      : "Wheel/Speed Mode. The servo rotates continuously at a specified speed and direction, like a motor."}
                  </li>
                </ul>
                <p className="text-xs mt-1">
                  {language === "zh"
                    ? "更改模式需要解锁、写入模式值（0或1）并锁定配置。"
                    : "Changing the mode requires unlocking, writing the mode value (0 or 1), and locking the configuration."}
                </p>
              </li>
              <li>
                <strong>{language === "zh" ? "位置：" : "Position:"}</strong>
                {language === "zh"
                  ? "在位置模式（模式0）下，此值表示舵机输出轴的目标或当前角度位置。"
                  : "In Position Mode (Mode 0), this value represents the target or current angular position of the servo's output shaft."}
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    {language === "zh" ? "范围：" : "Range:"}
                    {language === "zh" ? "通常为 " : "Typically "}
                    <code className="bg-gray-600 px-1 rounded">0</code>
                    {language === "zh" ? " 到 " : " to "}
                    <code className="bg-gray-600 px-1 rounded">4095</code>
                    {language === "zh"
                      ? "（表示12位分辨率）。"
                      : " (representing a 12-bit resolution)."}
                  </li>
                  <li>
                    {language === "zh" ? "含义：" : "Meaning:"}
                    {language === "zh"
                      ? "对应舵机的旋转范围（例如，0-360度或0-270度，取决于具体的舵机型号）。"
                      : "Corresponds to the servo's rotational range (e.g., 0-360 degrees or 0-270 degrees, depending on the specific servo model). "}
                    <code className="bg-gray-600 px-1 rounded">0</code>
                    {language === "zh"
                      ? " 是范围的一端，"
                      : " is one end of the range, "}
                    <code className="bg-gray-600 px-1 rounded">4095</code>
                    {language === "zh" ? " 是另一端。" : " is the other."}
                  </li>
                </ul>
              </li>
              <li>
                <strong>
                  {language === "zh"
                    ? "速度（轮子模式）："
                    : "Speed (Wheel Mode):"}
                </strong>
                {language === "zh"
                  ? "在轮子模式（模式1）下，此值控制旋转速度和方向。"
                  : "In Wheel Mode (Mode 1), this value controls the rotational speed and direction."}
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    {language === "zh" ? "范围：" : "Range:"}
                    {language === "zh" ? "通常为 " : "Typically "}
                    <code className="bg-gray-600 px-1 rounded">-2500</code>
                    {language === "zh" ? " 到 " : " to "}
                    <code className="bg-gray-600 px-1 rounded">+2500</code>.
                    {language === "zh"
                      ? "（注意：一些文档可能提到-1023到+1023，但SDK示例使用更宽的范围）。"
                      : " (Note: Some documentation might mention -1023 to +1023, but the SDK example uses a wider range)."}
                  </li>
                  <li>
                    {language === "zh" ? "含义：" : "Meaning:"}
                    <code className="bg-gray-600 px-1 rounded">0</code>
                    {language === "zh"
                      ? " 停止轮子。正值向一个方向旋转（例如顺时针），负值向相反方向旋转（例如逆时针）。数值大小决定速度（绝对值越大意味着旋转越快）。"
                      : " stops the wheel. Positive values rotate in one direction (e.g., clockwise), negative values rotate in the opposite direction (e.g., counter-clockwise). The magnitude determines the speed (larger absolute value means faster rotation)."}
                  </li>
                  <li>
                    {language === "zh" ? "控制地址：" : "Control Address:"}
                    <code className="bg-gray-600 px-1 rounded">
                      ADDR_SCS_GOAL_SPEED
                    </code>{" "}
                    {language === "zh"
                      ? "（寄存器 46/47）。"
                      : "(Register 46/47)."}
                  </li>
                </ul>
              </li>
              <li>
                <strong>
                  {language === "zh" ? "加速度：" : "Acceleration:"}
                </strong>
                {language === "zh"
                  ? "控制舵机改变速度以达到目标位置（位置模式）或目标速度（轮子模式）的快慢。"
                  : "Controls how quickly the servo changes speed to reach its target position (in Position Mode) or target speed (in Wheel Mode)."}
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    {language === "zh" ? "范围：" : "Range:"}
                    {language === "zh" ? "通常为 " : "Typically "}
                    <code className="bg-gray-600 px-1 rounded">0</code>
                    {language === "zh" ? " 到 " : " to "}
                    <code className="bg-gray-600 px-1 rounded">254</code>.
                  </li>
                  <li>
                    {language === "zh" ? "含义：" : "Meaning:"}
                    {language === "zh"
                      ? "定义速度变化率。单位是100步/秒²。"
                      : "Defines the rate of change of speed. The unit is 100 steps/s². "}
                    <code className="bg-gray-600 px-1 rounded">0</code>
                    {language === "zh"
                      ? " 通常意味着瞬时加速（或最小延迟）。更高的值会导致更慢、更平滑的加速和减速。例如，值为 "
                      : " usually means instantaneous acceleration (or minimal delay). Higher values result in slower, smoother acceleration and deceleration. For example, a value of "}
                    <code className="bg-gray-600 px-1 rounded">10</code>
                    {language === "zh"
                      ? " 意味着速度每秒变化10 * 100 = 1000步。这有助于减少颠簸运动和机械应力。"
                      : " means the speed changes by 10 * 100 = 1000 steps per second, per second. This helps reduce jerky movements and mechanical stress."}
                  </li>
                  <li>
                    {language === "zh" ? "控制地址：" : "Control Address:"}
                    <code className="bg-gray-600 px-1 rounded">
                      ADDR_SCS_GOAL_ACC
                    </code>{" "}
                    {language === "zh" ? "（寄存器 41）。" : "(Register 41)."}
                  </li>
                </ul>
              </li>
              <li>
                <strong>{language === "zh" ? "波特率：" : "Baud Rate:"}</strong>
                {language === "zh"
                  ? "控制器和舵机之间的通信速度。两端必须匹配。舵机通常支持多种波特率，可通过索引选择："
                  : "The speed of communication between the controller and the servo. It must match on both ends. Servos often support multiple baud rates, selectable via an index:"}
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    {language === "zh" ? "索引" : "Index"} 0: 1,000,000 bps
                  </li>
                  <li>{language === "zh" ? "索引" : "Index"} 1: 500,000 bps</li>
                  <li>{language === "zh" ? "索引" : "Index"} 2: 250,000 bps</li>
                  <li>{language === "zh" ? "索引" : "Index"} 3: 128,000 bps</li>
                  <li>{language === "zh" ? "索引" : "Index"} 4: 115,200 bps</li>
                  <li>{language === "zh" ? "索引" : "Index"} 5: 76,800 bps</li>
                  <li>{language === "zh" ? "索引" : "Index"} 6: 57,600 bps</li>
                  <li>{language === "zh" ? "索引" : "Index"} 7: 38,400 bps</li>
                </ul>
              </li>
            </ul>
          </div>
        </details>

        {/* Connection Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            {t.connection}
          </h2>

          {/* Connection Settings */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  {t.baudRate}
                </label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {baudRateOptions.map((option) => (
                    <option key={option.index} value={option.rate}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  {t.protocolEnd}{" "}
                  <span className="text-xs text-zinc-400">
                    {t.protocolEndNote}
                  </span>
                </label>
                <Input
                  type="number"
                  value={protocolEnd}
                  onChange={(e) => setProtocolEnd(parseInt(e.target.value, 10))}
                  min="0"
                  max="1"
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Connection Toggle Button */}
          <Button
            onClick={isConnected ? handleDisconnect : handleConnect}
            className={`w-full mb-6 text-white ${
              isConnected
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isConnected ? t.disconnect : t.connect}
          </Button>

          {/* Connection Status */}
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-600">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-white font-medium">{t.status}</span>
              <span
                className={`font-bold ${
                  isConnected ? "text-green-400" : "text-red-400"
                }`}
              >
                {isConnected ? t.connected : t.disconnected}
              </span>
            </div>
          </div>
        </div>

        {/* Scan Servos Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            {t.scanServos}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  {t.startId}
                </label>
                <Input
                  type="number"
                  value={scanStartId}
                  onChange={(e) => setScanStartId(parseInt(e.target.value, 10))}
                  min="1"
                  max="252"
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  {t.endId}
                </label>
                <Input
                  type="number"
                  value={scanEndId}
                  onChange={(e) => setScanEndId(parseInt(e.target.value, 10))}
                  min="1"
                  max="252"
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
            </div>

            <Button
              onClick={handleScanServos}
              disabled={!isConnected || isScanning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-zinc-600"
            >
              {isScanning ? t.scanning : t.startScan}
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                {t.scanResults}
              </label>
              <pre className="bg-zinc-900 p-4 rounded-lg border border-zinc-600 text-xs text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {scanResults || t.noScanResults}
              </pre>
            </div>
          </div>
        </div>

        {/* Single Servo Control Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            {t.singleServoControl}
          </h2>

          <div className="space-y-6">
            {/* Servo ID Selection */}
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-600">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  {t.currentServoId}
                </label>
                <Input
                  type="number"
                  value={servoId}
                  onChange={(e) => setServoId(parseInt(e.target.value, 10))}
                  min="1"
                  max="252"
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
              </div>
            </div>

            {/* Control Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ID Management */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">{t.idManagement}</h3>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newId}
                    onChange={(e) => setNewId(parseInt(e.target.value, 10))}
                    min="1"
                    max="252"
                    placeholder="New ID"
                    className="bg-zinc-700 border-zinc-600 text-white flex-1"
                  />
                  <Button
                    onClick={handleWriteId}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.changeId}
                  </Button>
                </div>
                {idChangeResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {idChangeResult}
                  </p>
                )}
              </div>

              {/* Baud Rate Management */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">{t.baudRate}</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleReadBaud}
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700  text-white  flex-1"
                  >
                    {t.readBaud}
                  </Button>
                  <Input
                    type="number"
                    value={baudWrite}
                    onChange={(e) => setBaudWrite(parseInt(e.target.value, 10))}
                    min="0"
                    max="7"
                    className="bg-zinc-700 border-zinc-600 text-white w-16"
                  />
                  <Button
                    onClick={handleWriteBaud}
                    className="bg-blue-700 hover:bg-blue-600 text-white"
                  >
                    Set
                  </Button>
                </div>
                {readBaudResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {readBaudResult}
                  </p>
                )}
              </div>

              {/* Position Control */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">
                  {t.positionControl}
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleReadPosition}
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700  text-white  flex-1"
                  >
                    {t.readPosition}
                  </Button>
                  <Input
                    type="number"
                    value={positionWrite}
                    onChange={(e) =>
                      setPositionWrite(parseInt(e.target.value, 10))
                    }
                    min="0"
                    max="4095"
                    className="bg-zinc-700 border-zinc-600 text-white w-20"
                  />
                  <Button
                    onClick={handleWritePosition}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Set
                  </Button>
                </div>
                {readPosResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {readPosResult}
                  </p>
                )}
              </div>

              {/* Torque Control */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">{t.torqueControl}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleTorqueEnable}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.enableTorque}
                  </Button>
                  <Button
                    onClick={handleTorqueDisable}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.disableTorque}
                  </Button>
                </div>
                {torqueResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {torqueResult}
                  </p>
                )}
              </div>

              {/* Acceleration Control */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">{t.acceleration}</h3>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={accelerationWrite}
                    onChange={(e) =>
                      setAccelerationWrite(parseInt(e.target.value, 10))
                    }
                    min="0"
                    max="254"
                    className="bg-zinc-700 border-zinc-600 text-white flex-1"
                  />
                  <Button
                    onClick={handleWriteAcceleration}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.setAcceleration}
                  </Button>
                </div>
                {accelerationResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {accelerationResult}
                  </p>
                )}
              </div>

              {/* Mode Control */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">{t.modeControl}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleSetWheelMode}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.wheelMode}
                  </Button>
                  <Button
                    onClick={handleSetPositionMode}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.positionMode}
                  </Button>
                </div>
                {modeResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {modeResult}
                  </p>
                )}
              </div>

              {/* Wheel Speed Control */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-300">{t.wheelSpeed}</h3>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={wheelSpeedWrite}
                    onChange={(e) =>
                      setWheelSpeedWrite(parseInt(e.target.value, 10))
                    }
                    min="-2500"
                    max="2500"
                    className="bg-zinc-700 border-zinc-600 text-white flex-1"
                  />
                  <Button
                    onClick={handleWriteWheelSpeed}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {t.setSpeed}
                  </Button>
                </div>
                {wheelSpeedResult && (
                  <p className="text-sm text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-600">
                    {wheelSpeedResult}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Operations Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            {t.syncOperations}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sync Read Positions */}
            <div className="space-y-4">
              <h3 className="font-medium text-zinc-300">
                {t.syncReadPositions}
              </h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={syncReadIds}
                  onChange={(e) => setSyncReadIds(e.target.value)}
                  placeholder={t.syncReadPositionsPlaceholder}
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
                <Button
                  onClick={handleSyncReadPositions}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {t.syncReadPositionsButton}
                </Button>
                <label className="text-xs font-medium text-zinc-400">
                  {t.syncReadPositionsResult}
                </label>
                <pre className="bg-zinc-900 p-2 rounded border border-zinc-600 text-xs text-zinc-300 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {syncReadPositionsResult}
                </pre>
              </div>
            </div>
            {/* Sync Write Positions */}
            <div className="space-y-4">
              <h3 className="font-medium text-zinc-300">
                {t.syncWritePositions}
              </h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={syncWriteData}
                  onChange={(e) => setSyncWriteData(e.target.value)}
                  placeholder="1:1500,2:2500"
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
                <Button
                  onClick={handleSyncWrite}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {t.syncWritePositions}
                </Button>
              </div>
            </div>

            {/* Sync Write Speeds */}
            <div className="space-y-4">
              <h3 className="font-medium text-zinc-300">{t.syncWriteSpeeds}</h3>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={syncWriteSpeedData}
                  onChange={(e) => setSyncWriteSpeedData(e.target.value)}
                  placeholder="1:500,2:-1000"
                  className="bg-zinc-700 border-zinc-600 text-white"
                />
                <Button
                  onClick={handleSyncWriteSpeed}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {t.syncWriteSpeeds}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Log Output Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            {t.logOutput}
          </h2>
          <pre
            ref={logOutputRef}
            className="bg-zinc-900 p-4 rounded-lg border border-zinc-600 text-xs text-zinc-300 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono"
          >
            {logs.length > 0 ? logs.join("\n") : t.logsWillAppear}
          </pre>
        </div>

        {/* Edit This Page Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            {t.editThisPage}
          </h2>
          <div className="space-y-4">
            <p className="text-zinc-300">{t.editDescription}</p>
            <a
              href="https://github.com/timqian/bambot/blob/main/website/app/feetech.js/page.tsx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <span>📝</span>
              <span>{t.editThisPage}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeetechPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800 py-8 pt-20 flex items-center justify-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      }
    >
      <FeetechPageContent />
    </Suspense>
  );
}
