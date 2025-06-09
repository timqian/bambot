"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { robotConfigMap } from "@/config/robotConfig";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import URDFLoader, { URDFRobot, URDFJoint } from "urdf-loader";
import { OrbitControls, Html, useProgress, Stats } from "@react-three/drei";
import { Physics, useBox, useContactMaterial } from "@react-three/cannon";
import { GroundPlane } from "./GroundPlane";
import { ControlPanel } from "./controlPanel/index";
import {
  JointState,
  useRobotControl,
  UpdateJointsSpeed,
} from "@/hooks/useRobotControl";
import { Canvas } from "@react-three/fiber";
import { degreesToRadians } from "@/lib/utils";
import { ChatControl } from "./ChatControl"; // Import ChatControl component
import { ScenarioObjects } from "./ScenarioObjects"; // Import ScenarioObjects component
import { Scenario, ScenarioObject } from "@/lib/scenarios"; // Import scenario types
import { RobotPhysics } from "./RobotPhysics"; // Import robot physics component

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

function RobotScene({
  robotName,
  urdfUrl,
  orbitTarget,
  jointDetails,
  setJointDetails,
  jointStates,
  scenarioObjects,

}: {
  robotName: string;
  urdfUrl: string;
  orbitTarget?: [number, number, number];
  jointDetails: JointDetails[];
  setJointDetails: (details: JointDetails[]) => void;
  jointStates: JointState[]; // Updated type
  scenarioObjects: ScenarioObject[]; // Add scenario objects prop
}) {
  const { scene } = useThree();
  const robotRef = useRef<URDFRobot | null>(null);

  useEffect(() => {
    const manager = new THREE.LoadingManager();
    const loader = new URDFLoader(manager);

    loader.load(
      urdfUrl,
      (robot) => {
        robotRef.current = robot;

        const joints: JointDetails[] = [];
        const details: JointDetails[] = robot.joints
          ? Object.values(robot.joints)
              .filter(
                (
                  joint
                ): joint is URDFJoint & {
                  jointType: "revolute" | "continuous";
                } =>
                  joint.jointType === "revolute" ||
                  joint.jointType === "continuous"
              )
              .map((joint) => ({
                name: joint.name,
                servoId: robotConfigMap[robotName].jointNameIdMap?.[joint.name] || 0, // Fetch servoId using jointNameIdMap with safety check
                limit: {
                  // Ensure conversion to primitive number
                  lower:
                    joint.limit.lower === undefined
                      ? undefined
                      : Number(joint.limit.lower),
                  upper:
                    joint.limit.upper === undefined
                      ? undefined
                      : Number(joint.limit.upper),
                },
                jointType: joint.jointType,
              }))
          : [];
        setJointDetails(details);

        robot.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / -2);
        robot.traverse((c) => (c.castShadow = true));
        robot.updateMatrixWorld(true);
        const scale = 15;
        robot.scale.set(scale, scale, scale);
        scene.add(robot);
      },
      undefined,
      (error) => console.error("Error loading URDF:", error)
    );
  }, [robotName, urdfUrl, setJointDetails]);

  useFrame((state, delta) => {
    if (robotRef.current && robotRef.current.joints) {
      jointStates.forEach((state) => {
        const jointObj = robotRef.current!.joints[state.name]; // Use state.name to find the joint
        if (jointObj) {
          // Handle non-continuous joints based on target degrees
          if (
            state.virtualDegrees !== undefined &&
            jointObj.jointType !== "continuous"
          ) {
            jointObj.setJointValue(degreesToRadians(state.virtualDegrees)); // Convert degrees to radians
          }
          // Handle continuous joints based on speed
          // Assumes state.virtualSpeed is in radians per second
          else if (
            state.virtualSpeed !== undefined &&
            jointObj.jointType === "continuous"
          ) {
            // Increment the joint angle based on speed and frame delta time
            // Assumes jointObj.angle holds the current angle in radians
            const currentAngle = Number(jointObj.angle) || 0; // Ensure primitive number
            jointObj.setJointValue(
              currentAngle + (state.virtualSpeed * delta) / 500
            );
          }
        }
      });
      
      // Depending on how urdf-loader handles updates, you might need this:
      robotRef.current.updateMatrixWorld(true);
    }
  });

  return (
    <>
      <OrbitControls target={orbitTarget || [0, 0.1, 0.1]} />
      <Physics gravity={[0, -9.82, 0]}
        iterations={10} // Reduced from default 20 - lower is faster
        tolerance={0.01} // Increased tolerance for faster solving
        stepSize={1/20} // Fixed timestep
        broadphase="Naive" // Naive is faster for smaller scenes, SAP for larger
        // allowSleep={true} // Allow objects to sleep when not moving
        axisIndex={0} // For SAPBroadphase if you switch to it later
        // Enable quantized physics for better performance
        quatNormalizeFast={true}
        isPaused={true}
        quatNormalizeSkip={2}>
        {/* <ContactMaterials /> */}
        <GroundPlane />
        {/* <ScenarioObjects objects={scenarioObjects} /> */}
        {/* {robotRef.current && (
          <RobotPhysics robot={robotRef.current} jointStates={jointStates} />
        )} */}
      </Physics>
      <directionalLight
        // castShadow
        intensity={1}
        position={[2, 20, 5]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        intensity={1}
        position={[-2, 20, -5]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.4} />
    </>
  );
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center className="text-4xl text-white">
      {progress} % loaded
    </Html>
  );
}

// Contact Materials Component
function ContactMaterials() {
  // Jaw-to-Object interaction - Very high friction for gripping
  useContactMaterial('jaw', 'object', {
    friction: 2.0,
    restitution: 0,
    frictionEquationStiffness: 1e8,
    frictionEquationRelaxation: 3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
  });

  // Robot part to Object - Medium friction for interaction
  // useContactMaterial('robot', 'object', {
  //   friction: 0.8,
  //   restitution: 0.05,
  //   frictionEquationStiffness: 1e8,
  //   frictionEquationRelaxation: 3,
  //   contactEquationStiffness: 1e8,
  //   contactEquationRelaxation: 3,
  // });

  // Object to Ground - Normal interaction
  // useContactMaterial('object', 'ground', {
  //   friction: 0.6,
  //   restitution: 0.1,
  //   frictionEquationStiffness: 1e8,
  //   frictionEquationRelaxation: 3,
  //   contactEquationStiffness: 1e8,
  //   contactEquationRelaxation: 3,
  // });

  // Robot to Ground - Low friction to allow movement
  // useContactMaterial('robot', 'ground', {
  //   friction: 0.3,
  //   restitution: 0,
  // });

  // useContactMaterial('jaw', 'ground', {
  //   friction: 0.3,
  //   restitution: 0,
  // });

  return null;
}

export default function RobotLoader({ robotName }: RobotLoaderProps) {
  const [jointDetails, setJointDetails] = useState<JointDetails[]>([]);
  const [scenarioObjects, setScenarioObjects] = useState<ScenarioObject[]>([]);

  const config = robotConfigMap[robotName];

  if (!config) {
    throw new Error(`Robot configuration for "${robotName}" not found.`);
  }

  const {
    urdfUrl,
    orbitTarget,
    camera,
    keyboardControlMap,
    jointNameIdMap,
    compoundMovements,
    systemPrompt, // <-- Add this line
  } = config; // Extract compoundMovements and systemPrompt

  const {
    isConnected,
    connectRobot,
    disconnectRobot,
    jointStates,
    updateJointSpeed,
    setJointDetails: updateJointDetails,
    updateJointDegrees,
    updateJointsDegrees,
    updateJointsSpeed, // Add updateJointsSpeed
  } = useRobotControl(jointDetails);

  useEffect(() => {
    updateJointDetails(jointDetails);
  }, [jointDetails, updateJointDetails]);

  // Expose compoundMovements globally for ControlPanel to access
  if (typeof window !== "undefined") {
    (window as any).bambotCompoundMovements = config.compoundMovements;
  }

  const handleLoadScenario = (scenario: Scenario) => {
    setScenarioObjects(scenario.objects);
    console.log(`Loaded scenario: ${scenario.title}`, scenario.objects);
  };

  return (
    <>
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
            jointDetails={jointDetails}
            setJointDetails={setJointDetails}
            jointStates={jointStates}
            scenarioObjects={scenarioObjects}
          />
        </Suspense>
        <Stats showPanel={1} />
      </Canvas>
      <ControlPanel
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
        onLoadScenario={handleLoadScenario}
      />
      <ChatControl robotName={robotName} systemPrompt={systemPrompt} />
    </>
  );
}
