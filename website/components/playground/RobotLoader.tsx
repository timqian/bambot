"use client";

import { useEffect, useState, Suspense } from "react";
import { robotConfigMap } from "@/config/robotConfig";
import * as THREE from "three";
import { Html, useProgress } from "@react-three/drei";
import { ControlPanel } from "./keyboardControl/KeyboardControl";
import { useRobotControl } from "@/hooks/useRobotControl";
import { Canvas } from "@react-three/fiber";
import { ChatControl } from "./chatControl/ChatControl";
import LeaderControl from "../playground/leaderControl/LeaderControl";
import { useLeaderRobotControl } from "@/hooks/useLeaderRobotControl";
import { RobotScene } from "./RobotScene";
import KeyboardControlButton from "../playground/controlButtons/KeyboardControlButton";
import ChatControlButton from "../playground/controlButtons/ChatControlButton";
import LeaderControlButton from "../playground/controlButtons/LeaderControlButton";

export type JointDetails = {
  name: string;
  servoId: number;
  limit: {
    lower?: number;
    upper?: number;
  };
  jointType: "revolute" | "continuous";
};

type RobotLoaderProps = {
  robotName: string;
};

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center className="text-4xl text-white">
      {progress} % loaded
    </Html>
  );
}

export default function RobotLoader({ robotName }: RobotLoaderProps) {
  const [jointDetails, setJointDetails] = useState<JointDetails[]>([]);
  const [showControlPanel, setShowControlPanel] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 900;
    }
    return true;
  });
  const [showLeaderControl, setShowLeaderControl] = useState(false);
  const [showChatControl, setShowChatControl] = useState(false);
  const config = robotConfigMap[robotName];

  // Get leader robot servo IDs (exclude continuous joint types)
  const leaderServoIds = jointDetails
    .filter((j) => j.jointType !== "continuous")
    .map((j) => j.servoId);

  // Initialize leader robot control hook
  const leaderControl = useLeaderRobotControl(leaderServoIds);

  if (!config) {
    throw new Error(`Robot configuration for "${robotName}" not found.`);
  }

  const {
    urdfUrl,
    orbitTarget,
    camera,
    keyboardControlMap,
    compoundMovements,
    systemPrompt,
  } = config;

  const {
    isConnected,
    connectRobot,
    disconnectRobot,
    jointStates,
    updateJointSpeed,
    setJointDetails: updateJointDetails,
    updateJointDegrees,
    updateJointsDegrees,
    updateJointsSpeed,
  } = useRobotControl(jointDetails);

  useEffect(() => {
    updateJointDetails(jointDetails);
  }, [jointDetails, updateJointDetails]);

  return (
    <>
      {/* LeaderControl overlay */}
      <LeaderControl
        show={showLeaderControl}
        onHide={() => setShowLeaderControl(false)}
        leaderControl={leaderControl}
        jointDetails={jointDetails}
        onSync={(leaderAngles: { servoId: number; angle: number }[]) => {
          updateJointsDegrees(
            leaderAngles.map(
              ({ servoId, angle }: { servoId: number; angle: number }) => ({
                servoId,
                value: angle,
              })
            )
          );
        }}
      />
      <Canvas
        shadows
        camera={{
          position: camera.position,
          fov: camera.fov,
        }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(0x263238);
        }}
      >
        <Suspense fallback={<Loader />}>
          <RobotScene
            robotName={robotName}
            urdfUrl={urdfUrl}
            orbitTarget={orbitTarget}
            setJointDetails={setJointDetails}
            jointStates={jointStates}
          />
        </Suspense>
      </Canvas>

      <ControlPanel
        show={showControlPanel}
        onHide={() => setShowControlPanel(false)}
        updateJointsSpeed={updateJointsSpeed}
        jointStates={jointStates}
        updateJointDegrees={updateJointDegrees}
        updateJointsDegrees={updateJointsDegrees}
        updateJointSpeed={updateJointSpeed}
        isConnected={isConnected}
        connectRobot={connectRobot}
        disconnectRobot={disconnectRobot}
        keyboardControlMap={keyboardControlMap}
        compoundMovements={compoundMovements}
      />
      <ChatControl
        show={showChatControl}
        onHide={() => setShowChatControl(false)}
        robotName={robotName}
        systemPrompt={systemPrompt}
      />

      <div className="absolute bottom-5 left-0 right-0">
        <div className="flex justify-center items-center">
          <div className="flex gap-2 max-w-md">
            <LeaderControlButton
              showControlPanel={showLeaderControl}
              onToggleControlPanel={() => setShowLeaderControl((v) => !v)}
            />
            <KeyboardControlButton
              showControlPanel={showControlPanel}
              onToggleControlPanel={() => setShowControlPanel((v) => !v)}
            />

            <ChatControlButton
              showControlPanel={showChatControl}
              onToggleControlPanel={() => setShowChatControl((v) => !v)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
