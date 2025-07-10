import { RiDownload2Line, RiLink } from "@remixicon/react";
import { ScsServoSDK } from "feetech.js";
import { useRef, useState } from "react";
import RobotPreview from "./RobotPreview";
import { useLocale } from "./LocaleContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const scsServoSDK = new ScsServoSDK();

export default function Calibrate() {
  const { t } = useLocale();
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFindingLimits, setIsFindingLimits] = useState(false);
  const [minPositions, setMinPositions] = useState<Map<number, number>>(
    new Map()
  );
  const [maxPositions, setMaxPositions] = useState<Map<number, number>>(
    new Map()
  );
  const [currentPositions, setCurrentPositions] = useState<Map<number, number>>(
    new Map()
  );
  const [limitFindingIntervalId, setLimitFindingIntervalId] =
    useState<NodeJS.Timeout | null>(null);
  const [corrections, setCorrections] = useState<Map<number, number>>(
    new Map()
  );
  const [robotConfig, setRobotConfig] = useState<Record<string, any> | null>(
    null
  );
  const [calibrationDone, setCalibrationDone] = useState(false);
  const limitsTableRef = useRef<HTMLDivElement>(null);

  const handleConnect = async () => {
    try {
      await scsServoSDK.connect();
      setIsConnected(true);
    } catch (err: any) {
      setIsConnected(false);
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await scsServoSDK.disconnect();
      setIsConnected(false);
    } catch (err: any) {
      console.error("Failed to disconnect", err);
      alert("Failed to disconnect. Check console for details.");
    }
  };

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [...prev, message]);
  };

  const servoIds = [1, 2, 3, 4, 5, 6];

  const handleStartFindingLimits = async () => {
    setIsFindingLimits(true);
    console.log(
      "Starting to find position limits. Move each servo to its extremes."
    );

    const initialMin = new Map<number, number>();
    const initialMax = new Map<number, number>();
    servoIds.forEach((id) => {
      initialMin.set(id, 4095); // Max possible value
      initialMax.set(id, 0); // Min possible value
    });
    setMinPositions(initialMin);
    setMaxPositions(initialMax);

    setTimeout(() => {
      limitsTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    const intervalId = setInterval(async () => {
      try {
        const readPositions = await scsServoSDK.syncReadPositions(servoIds);
        setCurrentPositions(readPositions);
        setMinPositions((prevMin) => {
          const newMin = new Map(prevMin);
          readPositions.forEach((pos, id) => {
            if (pos < (newMin.get(id) ?? 4095)) {
              newMin.set(id, pos);
            }
          });
          return newMin;
        });
        setMaxPositions((prevMax) => {
          const newMax = new Map(prevMax);
          readPositions.forEach((pos, id) => {
            if (pos > (newMax.get(id) ?? 0)) {
              newMax.set(id, pos);
            }
          });
          return newMax;
        });
      } catch (err: any) {
        console.error(`Error reading positions: ${err.message}`, err);
      }
    }, 100);
    setLimitFindingIntervalId(intervalId);
  };

  const handleStopAndSetLimits = async () => {
    if (limitFindingIntervalId) {
      clearInterval(limitFindingIntervalId);
      setLimitFindingIntervalId(null);
    }
    setIsFindingLimits(false);
    console.log("Stopped finding limits.");

    try {
      console.log(
        `Setting min position limits: ${JSON.stringify(
          Object.fromEntries(minPositions)
        )}`
      );
      await scsServoSDK.syncWriteMinPosLimits(minPositions);
      console.log("Min position limits set successfully.");

      console.log(
        `Setting max position limits: ${JSON.stringify(
          Object.fromEntries(maxPositions)
        )}`
      );
      await scsServoSDK.syncWriteMaxPosLimits(maxPositions);
      console.log("Max position limits set successfully.");

      console.log("Position limits configuration complete!");

      const jointNames: Record<number, string> = {
        1: "shoulder_pan",
        2: "shoulder_lift",
        3: "elbow_flex",
        4: "wrist_flex",
        5: "wrist_roll",
        6: "gripper",
      };

      const newRobotConfig: Record<string, any> = {};
      servoIds.forEach((id) => {
        const jointName = jointNames[id];
        newRobotConfig[jointName] = {
          id: id,
          drive_mode: 0, // Assuming 0 for now
          homing_offset: corrections.get(id) ?? "Not calibrated",
          range_min: minPositions.get(id),
          range_max: maxPositions.get(id),
        };
      });

      setRobotConfig(newRobotConfig);
      console.log("Robot configuration generated.");
    } catch (err: any) {
      const errorMessage = `Failed to set limits: ${err.message || err}`;
      console.error("Failed to set limits:", err);
      alert("Failed to set limits. Check logs for details.");
    }
  };

  const handleCalibrate = async () => {
    setLogs([]);
    const addLog = (message: string) => {
      console.log(message);
      setLogs((prev) => [...prev, message]);
    };

    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const servoIds = [1, 2, 3, 4, 5, 6];
    const targetPosition = 2047;
    addLog("Starting calibration...");

    try {
      // 1. Reset all position corrections to 0
      addLog("Resetting all position corrections to 0...");
      const zeroCorrections = new Map<number, number>();
      servoIds.forEach((id) => zeroCorrections.set(id, 0));
      await scsServoSDK.syncWritePosCorrection(zeroCorrections);
      addLog("Position corrections reset.");
      await delay(20);

      // 2. Read current positions (which are now physical positions)
      addLog(`Reading current positions for servos: [${servoIds.join(", ")}]`);
      const physicalPositions = await scsServoSDK.syncReadPositions(servoIds);
      addLog(
        `Current physical positions: ${JSON.stringify(
          Object.fromEntries(physicalPositions)
        )}`
      );
      await delay(20);

      // 3. Calculate new corrections and apply them
      const newCorrections = new Map<number, number>();
      for (const [id, physicalPosition] of physicalPositions.entries()) {
        // We want New Reported (target) = Physical - newCorrection
        // So, newCorrection = Physical - target
        const correction = physicalPosition - targetPosition;
        newCorrections.set(id, correction);
      }
      setCorrections(newCorrections);
      addLog(
        `Calculated new corrections: ${JSON.stringify(
          Object.fromEntries(newCorrections)
        )}`
      );

      addLog("Applying new position corrections...");
      await scsServoSDK.syncWritePosCorrection(newCorrections);
      addLog("Position corrections applied.");
      await delay(20);

      // 4. Verify new positions
      addLog("Verifying new positions...");
      const newPositions = await scsServoSDK.syncReadPositions(servoIds);
      addLog(
        `New positions after calibration: ${JSON.stringify(
          Object.fromEntries(newPositions)
        )}`
      );

      addLog("Calibration complete!");
      setCalibrationDone(true);
    } catch (err: any) {
      const errorMessage = `Calibration failed: ${err.message || err}`;
      addLog(errorMessage);
      console.error("Calibration failed:", err);
      alert("Calibration failed. Check logs for details.");
    }
  };

  const handleDownloadConfig = () => {
    if (!robotConfig) return;

    const jsonString = JSON.stringify(robotConfig, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "so101.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="scroll-mt-32">
      <h2
        id="calibrate"
        className="group text-3xl font-bold text-white mb-6 scroll-mt-32"
      >
        <a href="#calibrate" className="flex items-center">
          {t.calibrate}
          <RiLink className="w-5 h-5 ml-2 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </h2>

      <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 mb-6">
        <p className="text-green-300">{t.calibrationDesc}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.connectToMotorBusCalibrate}
          </h3>
          <p className="text-zinc-400 text-sm mb-4">
            {t.connectToMotorBusCalibrateDesc}
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleConnect}
              disabled={isConnected}
              className={`font-bold py-2 px-4 rounded text-white ${
                isConnected
                  ? "bg-green-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isConnected ? t.connected : t.connect}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              className={`font-bold py-2 px-4 rounded text-white ${
                !isConnected
                  ? "bg-zinc-500 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {t.disconnect}
            </button>
          </div>
        </div>

        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.calibrateButton}
          </h3>
          <p className="text-zinc-300 mb-3">{t.calibrateDesc}</p>
          <RobotPreview />
          <div className="mt-4">
            <button
              onClick={handleCalibrate}
              disabled={!isConnected}
              className={`font-bold py-2 px-4 rounded text-white ${
                !isConnected
                  ? "bg-zinc-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {t.calibrateButton}
            </button>
          </div>
          {logs.length > 0 && (
            <div className="mt-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 font-mono text-sm text-zinc-300 max-h-68 overflow-y-auto">
              {logs.map((log, index) => (
                <p key={index} className="whitespace-pre-wrap break-words">
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.setMotorPositionLimits}
          </h3>
          <p className="text-zinc-300 mb-3">{t.setMotorPositionLimitsDesc}</p>

          {minPositions.size > 0 && (
            <div
              ref={limitsTableRef}
              className="mt-4 text-zinc-300 font-mono text-sm"
            >
              <div className="grid grid-cols-4 gap-4 font-semibold text-center pb-2 border-b border-zinc-700">
                <span>{t.jointId}</span>
                <span>{t.min}</span>
                <span>{t.current}</span>
                <span>{t.max}</span>
              </div>
              {servoIds.map((id) => (
                <div
                  key={id}
                  className="grid grid-cols-4 gap-4 text-center py-2 border-b border-zinc-800"
                >
                  <span>{id}</span>
                  <span>{minPositions.get(id)}</span>
                  <span>{currentPositions.get(id) ?? "N/A"}</span>
                  <span>{maxPositions.get(id)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              onClick={handleStartFindingLimits}
              disabled={!isConnected || isFindingLimits}
              className={`font-bold py-2 px-4 rounded text-white ${
                !isConnected || isFindingLimits
                  ? "bg-zinc-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isFindingLimits ? t.finding : t.start}
            </button>
            <button
              onClick={handleStopAndSetLimits}
              disabled={!isFindingLimits}
              className={`font-bold py-2 px-4 rounded text-white ${
                !isFindingLimits
                  ? "bg-zinc-500 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {t.setLimits}
            </button>
          </div>
        </div>

        {robotConfig && (
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                {t.calibrationResult}
              </h3>
              <button
                onClick={handleDownloadConfig}
                className="flex items-center font-bold py-2 px-4 rounded text-white bg-blue-600 hover:bg-blue-700"
              >
                <RiDownload2Line className="w-5 h-5 mr-2" />
                {t.downloadJson}
              </button>
            </div>
            <p className="text-zinc-300 mb-3">{t.calibrationResultDesc}</p>
            <pre className="bg-zinc-900 p-4 rounded text-sm text-zinc-300 overflow-x-auto">
              {JSON.stringify(robotConfig, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">
            {t.congratulations}
          </h3>
          <p className="text-blue-300">{t.congratulationsDesc}</p>
          <Link href="/play/so-arm100" className="mt-4 inline-block">
            <Button>{t.goToControlPage}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
