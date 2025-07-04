import React, { useState, useEffect, useRef } from "react";
import { servoPositionToAngle } from "@/lib/utils";
import { Rnd } from "react-rnd";
import useMeasure from "react-use-measure";
import { panelStyle } from "@/components/playground/panelStyle";
import { LeaderConnectionHelpDialog } from "./LeaderConnectionHelpDialog";

/**
 * props:
 * - leaderControl: { isConnected, connectLeader, disconnectLeader, positions }
 * - jointDetails: JointDetails[]
 * - onSync: (leaderAngles: { servoId: number, angle: number }[]) => void
 * - show: boolean
 * - onHide: () => void
 */

const SYNC_INTERVAL = 10; // ms

const LeaderControl = ({
  leaderControl,
  jointDetails,
  onSync,
  show = true,
  onHide,
}) => {
  const revoluteJoints = jointDetails.filter((j) => j.jointType === "revolute");
  const { isConnected, connectLeader, disconnectLeader, getPositions } =
    leaderControl;
  const [angles, setAngles] = useState(
    revoluteJoints.map((j) => ({
      servoId: j.servoId,
      angle: 0,
    }))
  );
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "disconnecting"
  >("idle");
  const [ref, bounds] = useMeasure();

  // Periodically fetch positionChange and sync
  useEffect(() => {
    if (!isConnected) return;
    let timer = setInterval(async () => {
      const positions = await getPositions();
      // If positions map is empty, it might be due to disconnection or an error.
      // Avoid updating angles to prevent them from resetting to 0.
      if (positions.size === 0) return;
      const leaderAngles = revoluteJoints.map((j) => ({
        servoId: j.servoId,
        angle: servoPositionToAngle(positions.get(j.servoId) ?? 0),
      }));
      setAngles(leaderAngles);
      onSync(leaderAngles);
    }, SYNC_INTERVAL);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, revoluteJoints, getPositions, onSync]);

  // Initially position to bottom left corner
  useEffect(() => {
    if (bounds.height > 0) {
      setPosition({ x: 20, y: window.innerHeight - bounds.height - 20 });
    }
  }, [bounds.height]);

  const handleConnect = async () => {
    setConnectionStatus("connecting");
    try {
      await connectLeader();
    } finally {
      setConnectionStatus("idle");
    }
  };

  const handleDisconnect = async () => {
    setConnectionStatus("disconnecting");
    try {
      await disconnectLeader();
      // Reset angles to 0 when disconnected
      setAngles(
        revoluteJoints.map((j) => ({
          servoId: j.servoId,
          angle: 0,
        }))
      );
    } finally {
      setConnectionStatus("idle");
    }
  };

  if (!show) return null;

  return (
    <Rnd
      position={position}
      onDragStop={(_, d) => setPosition({ x: d.x, y: d.y })}
      bounds="window"
      className="z-50"
      style={{ display: show ? undefined : "none" }}
    >
      <div
        ref={ref}
        className={"max-h-[90vh] overflow-y-auto text-sm " + panelStyle}
      >
        <h3 className="mt-0 mb-4 border-b border-white/50 pb-1 font-bold text-base flex justify-between items-center">
          <span>Control via Leader Robot</span>
          <button
            className="ml-2 text-xl hover:bg-zinc-800 px-2 rounded-full"
            title="Collapse"
            onClick={onHide}
            onTouchEnd={onHide}
          >
            ×
          </button>
        </h3>

        {revoluteJoints.length === 0 ? (
          <div className="mt-4 text-center text-gray-400">
            No joints available for leader control.
          </div>
        ) : (
          <>
            <div className="mt-4">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="border-b border-gray-600 pb-1">Joint</th>
                    <th className="border-b border-gray-600 pb-1 text-center pl-4">
                      Angle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revoluteJoints.map((j) => (
                    <tr key={j.servoId}>
                      <td className="py-1">{j.name}</td>
                      <td className="py-1  text-center ">
                        {(() => {
                          const angle =
                            angles.find((a) => a.servoId === j.servoId)
                              ?.angle ?? 0;
                          const fixed = angle.toFixed(1);
                          return fixed + "°";
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center gap-2">
              {isConnected ? (
                <button
                  className={`bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded flex-1 ${
                    connectionStatus !== "idle"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={handleDisconnect}
                  disabled={connectionStatus !== "idle"}
                >
                  {connectionStatus === "disconnecting"
                    ? "Disconnecting..."
                    : "Disconnect Leader Robot"}
                </button>
              ) : (
                <button
                  className={`bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded flex-1 ${
                    connectionStatus !== "idle"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={handleConnect}
                  disabled={connectionStatus !== "idle"}
                >
                  {connectionStatus === "connecting"
                    ? "Connecting..."
                    : "Connect Leader Robot"}
                </button>
              )}
              <LeaderConnectionHelpDialog />
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
};

export default LeaderControl;
