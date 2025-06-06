"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { robotConfigMap } from "@/config/robotConfig";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import URDFLoader, { URDFRobot, URDFJoint } from "urdf-loader";
import { OrbitControls, Html, useProgress } from "@react-three/drei";
import { Physics, useBox } from "@react-three/cannon";
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
import { RobotCollisionDetector, RobotCollisionState } from "@/lib/robotCollision"; // Import collision detection
import { CollisionFeedback } from "./CollisionFeedback"; // Import collision feedback component
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
  onCollisionUpdate,
}: {
  robotName: string;
  urdfUrl: string;
  orbitTarget?: [number, number, number];
  jointDetails: JointDetails[];
  setJointDetails: (details: JointDetails[]) => void;
  jointStates: JointState[]; // Updated type
  scenarioObjects: ScenarioObject[]; // Add scenario objects prop
  onCollisionUpdate: (collisionState: RobotCollisionState) => void; // Add collision callback
}) {
  const { scene } = useThree();
  const robotRef = useRef<URDFRobot | null>(null);
  const collisionDetector = useRef(new RobotCollisionDetector());

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
      
      // Check for collisions if we have scenario objects
      if (scenarioObjects.length > 0) {
        const gripperPosition = collisionDetector.current.calculateGripperPosition(jointStates);
        const collisionState = collisionDetector.current.checkCollisions(gripperPosition, scenarioObjects);
        onCollisionUpdate(collisionState);
      }
      
      // Depending on how urdf-loader handles updates, you might need this:
      robotRef.current.updateMatrixWorld(true);
    }
  });

  return (
    <>
      <OrbitControls target={orbitTarget || [0, 0.1, 0.1]} />
      <Physics>
        <GroundPlane />
        <ScenarioObjects objects={scenarioObjects} />
        {robotRef.current && (
          <RobotPhysics robot={robotRef.current} jointStates={jointStates} />
        )}
      </Physics>
      <directionalLight
        castShadow
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

export default function RobotLoader({ robotName }: RobotLoaderProps) {
  const [jointDetails, setJointDetails] = useState<JointDetails[]>([]);
  const [scenarioObjects, setScenarioObjects] = useState<ScenarioObject[]>([]);
  const [collisionState, setCollisionState] = useState<RobotCollisionState>({
    nearbyObjects: [],
    canGrab: false,
  });
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

  const handleCollisionUpdate = (newCollisionState: RobotCollisionState) => {
    setCollisionState(newCollisionState);
    
    // Log collision events for debugging
    if (newCollisionState.canGrab && newCollisionState.nearbyObjects.length > 0) {
      console.log('Robot can grab:', newCollisionState.nearbyObjects.map(obj => obj.name));
    }
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
            onCollisionUpdate={handleCollisionUpdate}
          />
        </Suspense>
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
      <CollisionFeedback collisionState={collisionState} />
    </>
  );
}
