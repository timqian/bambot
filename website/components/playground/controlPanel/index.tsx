"use client";

import React, { useState } from "react";
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
import { ScenarioModal } from "../ScenarioModal";
import { Scenario } from "@/lib/scenarios";

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
  onLoadScenario?: (scenario: Scenario) => void; // Add scenario loading prop
};

export function ControlPanel({
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
  onLoadScenario, // Destructure scenario loading prop
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "disconnecting"
  >("idle");

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

  const handleLoadScenario = (scenario: Scenario) => {
    if (onLoadScenario) {
      onLoadScenario(scenario);
    }
  };

  // Separate jointStates into revolute and continuous categories
  const revoluteJoints = jointStates.filter(
    (state) => state.jointType === "revolute"
  );
  const continuousJoints = jointStates.filter(
    (state) => state.jointType === "continuous"
  );

  if (isCollapsed) {
    return (
      <div className="absolute bottom-5 left-5 z-50">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded"
        >
          Show Controls
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="absolute bottom-5 left-5 bg-zinc-900 bg-opacity-80 text-white p-4 rounded-lg max-h-[90vh] overflow-y-auto z-50 text-sm">
        <h3 className="mt-0 mb-4 border-b border-zinc-600 pb-1 font-bold text-base flex justify-between items-center">
          <span>Joint Controls</span>
          <button
            onClick={() => setIsCollapsed(true)}
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
            maxSpeed={1000} // Add missing maxSpeed prop
          />
        )}

        {/* Connection Controls */}
        <div className="mt-4 space-y-2">
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
          
          <button
            onClick={() => setIsScenarioModalOpen(true)}
            className="bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1.5 rounded w-full"
          >
            Load Scenario
          </button>
        </div>
      </div>

      <ScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        onLoadScenario={handleLoadScenario}
      />
    </>
  );
}
