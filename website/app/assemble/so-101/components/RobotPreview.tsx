"use client";

import { Canvas } from "@react-three/fiber";
import { robotConfigMap } from "@/config/robotConfig";
import { RobotScene, JointDetails } from "@/components/playground/RobotScene";
import { useState, useEffect } from "react";
import { JointState } from "@/hooks/useRobotControl";

export default function RobotPreview() {
  const robotName = "so-arm100";
  const robotConfig = robotConfigMap[robotName];
  const [jointDetails, setJointDetails] = useState<JointDetails[]>([]);
  const [jointStates, setJointStates] = useState<JointState[]>([]);

  useEffect(() => {
    if (jointDetails.length > 0) {
      const initialJointStates = jointDetails.map((detail) => {
        const initialAngle =
          robotConfig.urdfInitJointAngles?.[detail.name] ?? 0;
        return {
          name: detail.name,
          servoId: detail.servoId,
          degrees: initialAngle,
        };
      });
      setJointStates(initialJointStates);
    }
  }, [jointDetails, robotConfig.urdfInitJointAngles]);

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-zinc-600">
      <Canvas
        shadows
        camera={{
          position: robotConfig.camera.position as [number, number, number],
          fov: robotConfig.camera.fov,
        }}
      >
        <RobotScene
          robotName={robotName}
          urdfUrl={robotConfig.urdfUrl}
          orbitTarget={robotConfig.orbitTarget}
          setJointDetails={setJointDetails}
          jointStates={jointStates}
        />
      </Canvas>
    </div>
  );
}
