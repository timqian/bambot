import { RiLink } from "@remixicon/react";
import { ScsServoSDK } from "feetech.js";
import { useState } from "react";
import { useLocale } from "./LocaleContext";
const scsServoSDK = new ScsServoSDK();

const followerMotors = [
  { name: "gripper", newId: 6 },
  { name: "wrist_roll", newId: 5 },
  { name: "wrist_flex", newId: 4 },
  { name: "elbow_flex", newId: 3 },
  { name: "shoulder_lift", newId: 2 },
  { name: "shoulder_pan", newId: 1 },
];

export default function ConfigureMotors() {
  const { t } = useLocale();
  const [isConnected, setIsConnected] = useState(false);
  const [configuredMotors, setConfiguredMotors] = useState<string[]>([]);
  const [selectedMotorName, setSelectedMotorName] = useState<string | null>(
    null
  );
  const [fromId, setFromId] = useState<number | string>(1);
  const [toId, setToId] = useState<number | string>("");
  const [scanFromId, setScanFromId] = useState<number | string>(1);
  const [scanToId, setScanToId] = useState<number | string>(10);
  const [foundMotorData, setFoundMotorData] = useState<
    Map<number, number | null>
  >(new Map());
  const [isScanning, setIsScanning] = useState(false);

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
      setConfiguredMotors([]);
      setSelectedMotorName(null);
      setFoundMotorData(new Map());
    } catch (err: any) {
      console.error("Failed to disconnect", err);
      alert("Failed to disconnect. Check console for details.");
    }
  };

  const handleScan = async () => {
    if (!isConnected) {
      alert("Please connect to the motor bus first.");
      return;
    }
    setIsScanning(true);
    setFoundMotorData(new Map());
    try {
      const from = Number(scanFromId);
      const to = Number(scanToId);
      if (from > to) {
        alert("From ID cannot be greater than To ID.");
        setIsScanning(false);
        return;
      }

      let anyMotorFound = false;
      for (let id = from; id <= to; id++) {
        try {
          const position = await scsServoSDK.readPosition(id);
          setFoundMotorData((prev) => new Map(prev).set(id, position));
          anyMotorFound = true;
        } catch (error) {
          // Motor not found at this ID, continue to the next.
          setFoundMotorData((prev) => new Map(prev).set(id, null));
        }
      }

      if (!anyMotorFound) {
        alert("No motors found in the specified range.");
      }
    } catch (err: any) {
      console.error("Failed to scan for motors", err);
      alert("Failed to scan for motors. Check console for details.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectMotor = (motor: { name: string; newId: number }) => {
    setSelectedMotorName(motor.name);
    setFromId(1); // Default from ID
    setToId(motor.newId);
  };

  const handleSetId = async () => {
    if (!isConnected) {
      alert("Please connect to the motor bus first.");
      return;
    }
    if (!selectedMotorName) {
      alert("Please select a motor to configure.");
      return;
    }
    try {
      await scsServoSDK.setServoId(Number(fromId), Number(toId));
      setConfiguredMotors((prev) => [...prev, selectedMotorName]);
      alert(
        `Successfully set ID for ${selectedMotorName} from ${fromId} to ${toId}`
      );
      setSelectedMotorName(null);
      setFromId(1);
      setToId("");
    } catch (err: any) {
      console.error(`Failed to set ID for ${selectedMotorName}`, err);
      alert(
        `Failed to set ID for ${selectedMotorName}. Check console for details.`
      );
    }
  };

  return (
    <section className="scroll-mt-32">
      <h2
        id="configure"
        className="group text-3xl font-bold text-white mb-6 scroll-mt-32"
      >
        <a href="#configure" className="flex items-center">
          {t.configureTheMotors}
          <RiLink className="w-5 h-5 ml-2 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </h2>

      <div className="space-y-6">
        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.connectToMotorBus}
          </h3>
          <p className="text-zinc-300 mb-3">{t.connectPrompt}</p>
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
        </div>

        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.setupFollowerMotors}
          </h3>
          <p className="text-zinc-300 mb-3">{t.setupFollowerMotorsDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t.selectMotorToConfigure}
              </h4>
              {followerMotors.map((motor) => {
                const isConfigured = configuredMotors.includes(motor.name);
                return (
                  <button
                    key={motor.name}
                    onClick={() => handleSelectMotor(motor)}
                    disabled={isConfigured || !isConnected}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedMotorName === motor.name
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-900 hover:bg-zinc-700"
                    } ${
                      isConfigured
                        ? "bg-green-600 text-white cursor-not-allowed line-through"
                        : ""
                    } ${
                      !isConnected
                        ? "text-zinc-500 cursor-not-allowed"
                        : "text-white"
                    }`}
                  >
                    {motor.name.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">
                {t.setMotorId}
              </h4>
              <div className="bg-zinc-900 p-4 rounded-lg space-y-4">
                <div>
                  <label
                    htmlFor="fromId"
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    {t.fromId}
                  </label>
                  <input
                    type="number"
                    id="fromId"
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    disabled={!selectedMotorName}
                    className="w-full bg-zinc-950 text-white p-2 rounded border border-zinc-700 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="toId"
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    {t.toId}
                  </label>
                  <input
                    type="number"
                    id="toId"
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    disabled={!selectedMotorName}
                    className="w-full bg-zinc-950 text-white p-2 rounded border border-zinc-700 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleSetId}
                  disabled={!selectedMotorName}
                  className="w-full font-bold py-2 px-4 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-500 disabled:cursor-not-allowed"
                >
                  {t.setIdFor}{" "}
                  {selectedMotorName
                    ? selectedMotorName.replace(/_/g, " ")
                    : "..."}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.motorIdUncertain}
          </h3>
          <p className="text-zinc-300 mb-3">{t.scanForMotorsDesc}</p>
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1">
              <label
                htmlFor="scanFromId"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                {t.fromId}
              </label>
              <input
                type="number"
                id="scanFromId"
                value={scanFromId}
                onChange={(e) => setScanFromId(e.target.value)}
                disabled={!isConnected || isScanning}
                className="w-full bg-zinc-950 text-white p-2 rounded border border-zinc-700 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="scanToId"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                {t.toId}
              </label>
              <input
                type="number"
                id="scanToId"
                value={scanToId}
                onChange={(e) => setScanToId(e.target.value)}
                disabled={!isConnected || isScanning}
                className="w-full bg-zinc-950 text-white p-2 rounded border border-zinc-700 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={!isConnected || isScanning}
              className="font-bold py-2 px-4 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-500 disabled:cursor-not-allowed"
            >
              {isScanning ? t.scanning : t.scanForMotors}
            </button>
          </div>
          {foundMotorData.size > 0 && (
            <div className="bg-zinc-900 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t.scanResults}
              </h4>
              <div className="font-mono text-sm space-y-1">
                {Array.from(foundMotorData.entries()).map(([id, position]) => (
                  <p
                    key={id}
                    className={
                      position !== null ? "text-green-400" : "text-zinc-500"
                    }
                  >
                    ID {id}:{" "}
                    {position !== null
                      ? `${t.position} ${position}`
                      : t.notFound}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">
            {t.disconnectFromMotorBus}
          </h3>
          <p className="text-zinc-300 mb-3">{t.disconnectDesc}</p>
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
    </section>
  );
}
