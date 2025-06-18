"use client";

import React, { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import {
  JointState,
  UpdateJointDegrees,
  UpdateJointsDegrees,
  UpdateJointSpeed,
  UpdateJointsSpeed, // Add UpdateJointsSpeed type
} from "../../../hooks/useRobotControl"; // Adjusted import path
import { RevoluteJointsTable } from "./RevoluteJointsTable"; // Updated import path
import { ContinuousJointsTable } from "./ContinuousJointsTable"; // Updated import path
import { RobotConfig } from "@/config/robotConfig";
import useMeasure from "react-use-measure";

// const baudRate = 1000000; // Define baud rate for serial communication - Keep if needed elsewhere, remove if only for UI

// --- Control Panel Component ---
type ControlPanelProps = {
  jointStates: JointState[]; // Use JointState type from useRobotControl
  updateJointDegrees: UpdateJointDegrees; // Updated type
  updateJointsDegrees: UpdateJointsDegrees; // Updated type
  updateJointSpeed: UpdateJointSpeed; // Updated type
  updateJointsSpeed: UpdateJointsSpeed; // Add updateJointsSpeed

  isConnected: boolean;

  connectRobot: () => void;
  disconnectRobot: () => void;
  keyboardControlMap: RobotConfig["keyboardControlMap"]; // New prop for keyboard control
  compoundMovements?: RobotConfig["compoundMovements"]; // Use type from robotConfig
  onHide?: () => void; // 新增 onHide 属性
  show?: boolean; // 新增 show 属性
};

export function ControlPanel({
  show = true,
  onHide,
  jointStates,
  updateJointDegrees,
  updateJointsDegrees,
  updateJointSpeed,
  updateJointsSpeed, // Pass updateJointsSpeed
  isConnected,
  connectRobot,
  disconnectRobot,
  keyboardControlMap, // Destructure new prop
  compoundMovements, // Destructure new prop
}: ControlPanelProps) {
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
        x: 20,
        y: window.innerHeight - bounds.height - 20,
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
        className="bg-zinc-900 bg-opacity-80 text-white p-4 rounded-lg max-h-[90vh] overflow-y-auto text-sm"
      >
        <h3 className="mt-0 mb-4 border-b border-zinc-600 pb-1 font-bold text-base flex justify-between items-center">
          <span>Joint Controls</span>
          <button
            onClick={onHide} // 优先调用 onHide
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
            keyboardControlMap={keyboardControlMap}
            compoundMovements={compoundMovements}
          />
        )}

        {/* Continuous Joints Table */}
        {continuousJoints.length > 0 && (
          <ContinuousJointsTable
            joints={continuousJoints}
            updateJointSpeed={updateJointSpeed}
            updateJointsSpeed={updateJointsSpeed} // Pass updateJointsSpeed to ContinuousJointsTable
          />
        )}

        {/* Connection Controls */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={connectionStatus !== "idle"}
            className={`text-white text-sm px-3 py-1.5 rounded w-full ${
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
              : "Connect Real Robot"}
          </button>
        </div>
      </div>
    </Rnd>
  );
}
