"use client";

import React, { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import useMeasure from "react-use-measure";

import { RevoluteJointsTable } from "./RevoluteJointsTable";
import { ContinuousJointsTable } from "./ContinuousJointsTable";
import { panelStyle } from "@/components/playground/panelStyle";
import { RobotConnectionHelpDialog } from "@/components/RobotConnectionHelpDialog";

import { RobotConfig } from "@/config/robotConfig";
import {
  JointState,
  UpdateJointDegrees,
  UpdateJointsDegrees,
  UpdateJointSpeed,
  UpdateJointsSpeed,
} from "@/hooks/useRobotControl";

// --- Control Panel Component ---
type GamepadControlPanelProps = {
  jointStates: JointState[];
  updateJointDegrees: UpdateJointDegrees;
  updateJointsDegrees: UpdateJointsDegrees;
  updateJointSpeed: UpdateJointSpeed;
  updateJointsSpeed: UpdateJointsSpeed;

  isConnected: boolean;

  connectRobot: () => void;
  disconnectRobot: () => void;
  gamepadControlMap: RobotConfig["gamepadControlMap"]; // New prop for gamepad control
  compoundMovements?: RobotConfig["compoundMovements"];
  onHide?: () => void;
  show?: boolean;
};

export function GamepadControlPanel({
  show = true,
  onHide,
  jointStates,
  updateJointDegrees,
  updateJointsDegrees,
  updateJointSpeed,
  updateJointsSpeed,
  isConnected,
  connectRobot,
  disconnectRobot,
  gamepadControlMap,
  compoundMovements,
}: GamepadControlPanelProps) {
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "disconnecting"
  >("idle");
  const [ref, bounds] = useMeasure();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  useEffect(() => {
    if (bounds.height > 0 && !hasDragged) {
      setPosition((pos) => ({
        ...pos,
        x: 20, // Position 20px from left edge
        y: 20, // Position 20px from top edge
      }));
    }
  }, [bounds.height, hasDragged]);

  const handleConnect = async () => {
    setConnectionStatus("connecting");
    try {
      await connectRobot();
    } finally {
      setConnectionStatus("idle");
    }
  };

  const handleDisconnect = async () => {
    setConnectionStatus("disconnecting");
    try {
      await disconnectRobot();
    } finally {
      setConnectionStatus("idle");
    }
  };

  // Separate jointStates into revolute and continuous categories
  const revoluteJoints = jointStates.filter(
    (state) => state.jointType === "revolute"
  );
  const continuousJoints = jointStates.filter(
    (state) => state.jointType === "continuous"
  );

  return (
    <Rnd
      position={position}
      onDragStop={(_, d) => {
        setPosition({ x: d.x, y: d.y });
        setHasDragged(true);
      }}
      bounds="window"
      className="z-50"
      style={{ display: show ? undefined : "none" }}
    >
      <div
        ref={ref}
        className={"max-h-[80vh] overflow-y-auto text-sm " + panelStyle}
      >
        <h3 className="mt-0 mb-4 border-b border-white/50 pb-1 font-bold text-base flex justify-between items-center">
          <span>Gamepad Controls</span>
          <button
            onClick={onHide}
            onTouchEnd={onHide}
            className="ml-2 text-xl hover:bg-zinc-800 px-2 rounded-full"
            title="Collapse"
          >
            ×
          </button>
        </h3>

        {/* Revolute Joints Table */}
        {revoluteJoints.length > 0 && (
          <RevoluteJointsTable
            joints={revoluteJoints}
            updateJointDegrees={updateJointDegrees}
            updateJointsDegrees={updateJointsDegrees}
            gamepadControlMap={gamepadControlMap}
            compoundMovements={compoundMovements}
          />
        )}

        {/* Continuous Joints Table */}
        {continuousJoints.length > 0 && (
          <ContinuousJointsTable
            joints={continuousJoints}
            updateJointSpeed={updateJointSpeed}
            updateJointsSpeed={updateJointsSpeed}
            maxSpeed={10}
          />
        )}

        {/* Connection Controls */}
        <div className="mt-4 flex justify-between items-center gap-2">
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={connectionStatus !== "idle"}
            className={`text-white text-sm px-3 py-1.5 rounded flex-1 ${
              isConnected
                ? "bg-red-600 hover:bg-red-500"
                : "bg-blue-600 hover:bg-blue-500"
            } ${
              connectionStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {connectionStatus === "connecting"
              ? "Connecting..."
              : connectionStatus === "disconnecting"
              ? "Disconnecting..."
              : isConnected
              ? "Disconnect Robot"
              : "Connect Follower Robot"}
          </button>
          <RobotConnectionHelpDialog />
        </div>
      </div>
    </Rnd>
  );
}
