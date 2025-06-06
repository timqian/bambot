import React, { useEffect, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { JointState } from '@/hooks/useRobotControl';

interface RobotPhysicsProps {
  robot: any; // URDFRobot
  jointStates: JointState[];
}

// Dynamic physics body that follows robot parts with offset positioning
function DetailedJawCollisionBox({ 
  box,
  robot
}: { 
  box: {
    name: string;
    linkName: string;
    size: [number, number, number];
    offset: [number, number, number];
    rotation: [number, number, number];
  };
  robot: any;
}) {
  const [ref, api] = useBox(() => ({
    position: [0, 0, 0],
    args: box.size,
    type: 'Kinematic', // Kinematic bodies move but don't respond to forces
    material: {
      friction: 1.5, // Very high friction for gripping
      restitution: 0, // No bounce at all
      frictionEquation: {
        relaxation: 3, // Stable friction contacts
        stiffness: 1e8, // High stiffness
      },
      contactEquation: {
        relaxation: 3, // Stable contacts
        stiffness: 1e8, // Prevent interpenetration
      }
    },
    // Add collision response settings for better gripping
    collisionFilterGroup: 1, // Jaw collision group
    collisionFilterMask: -1, // Collide with everything
    isTrigger: false, // Full physics collision, not just detection
  }));

  // Update position based on actual robot link positions with offset
  useFrame(() => {
    if (robot && robot.links && robot.links[box.linkName]) {
      const link = robot.links[box.linkName];
      
      // Get the world matrix of the link
      link.updateMatrixWorld(true);
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      
      link.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      
      // Apply offset in local coordinate system
      const offsetVector = new THREE.Vector3(...box.offset);
      offsetVector.applyQuaternion(worldQuaternion);
      worldPosition.add(offsetVector);
      
      // Update physics body position and rotation
      api.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
      
      // Convert quaternion to euler for cannon
      const euler = new THREE.Euler().setFromQuaternion(worldQuaternion);
      api.rotation.set(euler.x + box.rotation[0], euler.y + box.rotation[1], euler.z + box.rotation[2]);
    }
  });

  return (
    <mesh ref={ref as any} visible={true}>
      <boxGeometry args={box.size} />
      <meshBasicMaterial transparent opacity={0.4} color="orange" wireframe />
    </mesh>
  );
}

// Dynamic physics body that follows robot parts
function DynamicRobotCollisionBox({ 
  size, 
  name,
  robot,
  linkName
}: { 
  size: [number, number, number], 
  name: string,
  robot: any,
  linkName: string
}) {
  const [ref, api] = useBox(() => ({
    position: [0, 0, 0],
    args: size,
    type: 'Kinematic', // Kinematic bodies move but don't respond to forces
    material: {
      friction: 0.8, // Good friction for interaction
      restitution: 0.05, // Very low bounce
      frictionEquation: {
        relaxation: 3, // Stable contacts
        stiffness: 1e8,
      },
      contactEquation: {
        relaxation: 3,
        stiffness: 1e8,
      }
    },
    collisionFilterGroup: 1, // Same group as jaws
    collisionFilterMask: -1, // Collide with everything
  }));

  // Update position based on actual robot link positions
  useFrame(() => {
    if (robot && robot.links && robot.links[linkName]) {
      const link = robot.links[linkName];
      
      // Get the world matrix of the link
      link.updateMatrixWorld(true);
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      
      link.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      
      // The robot is already scaled by 15, so we don't need to adjust the scale
      // Just use the world position directly
      
      // Update physics body position and rotation
      api.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
      
      // Convert quaternion to euler for cannon
      const euler = new THREE.Euler().setFromQuaternion(worldQuaternion);
      api.rotation.set(euler.x, euler.y, euler.z);
    }
  });

  return (
    <mesh ref={ref as any} visible={true}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0.3} color="red" wireframe />
    </mesh>
  );
}

export function RobotPhysics({ robot, jointStates }: RobotPhysicsProps) {
  // Get available links from robot when it's loaded
  const [availableLinks, setAvailableLinks] = React.useState<string[]>([]);
  
  useEffect(() => {
    if (robot && robot.links) {
      const linkNames = Object.keys(robot.links);
      setAvailableLinks(linkNames);
      console.log('Available robot links:', linkNames);
    }
  }, [robot]);

  // Define collision boxes for different robot links
  // Using the actual link names from the robot
  const collisionBoxes = [
    // Base
    { 
      name: 'base', 
      linkName: 'Base', 
      size: [1.0, 0.8, 1.0] as [number, number, number] 
    },
    // Rotation and Pitch combined
    { 
      name: 'rotation_pitch', 
      linkName: 'Rotation_Pitch', 
      size: [0.4, 0.8, 0.4] as [number, number, number] 
    },
    // Upper arm
    { 
      name: 'upper_arm', 
      linkName: 'Upper_Arm', 
      size: [0.3, 0.6, 0.3] as [number, number, number] 
    },
    // Lower arm
    { 
      name: 'lower_arm', 
      linkName: 'Lower_Arm', 
      size: [0.3, 0.4, 0.3] as [number, number, number] 
    },
    // Wrist (pitch and roll combined)
    { 
      name: 'wrist_pitch_roll', 
      linkName: 'Wrist_Pitch_Roll', 
      size: [0.25, 0.3, 0.25] as [number, number, number] 
    },
  ];

  // Detailed jaw collision boxes for gripping
  const jawCollisionBoxes = [
    // Fixed Jaw (bottom) - trying Z forward, Y separation approach
    { 
      name: 'fixed_jaw_main', 
      linkName: 'Fixed_Jaw', 
      size: [0.3, 1.2, 0.3] as [number, number, number], // X=width, Y=thin, Z=long (forward)
      offset: [0.33, -1, 0] as [number, number, number], // Down and forward
      rotation: [0, 0, -0.1] as [number, number, number]
    },
    
    // Moving Jaw (top) - trying Z forward, Y separation approach
    { 
      name: 'moving_jaw_main', 
      linkName: 'Moving_Jaw', 
      size: [0.3, 1.8, 0.3] as [number, number, number], // X=width, Y=thin, Z=long (forward)
      offset: [0.05, -0.3, 0] as [number, number, number], // Up and forward
      rotation: [0, 0, -0.1] as [number, number, number]
    },
  ];

  // Filter collision boxes to only include existing links
  const validCollisionBoxes = collisionBoxes.filter(box => 
    availableLinks.includes(box.linkName)
  );

  if (validCollisionBoxes.length === 0 && availableLinks.length > 0) {
    // If no exact matches, use the first few available links
    const fallbackBoxes = availableLinks.slice(0, 4).map((linkName, index) => ({
      name: `link_${index}`,
      linkName,
      size: [0.4, 0.4, 0.4] as [number, number, number]
    }));
    
    return (
      <>
        {fallbackBoxes.map((box, index) => (
          <DynamicRobotCollisionBox
            key={`${box.name}-${index}`}
            size={box.size}
            name={box.name}
            robot={robot}
            linkName={box.linkName}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {/* Regular robot part collision boxes */}
      {validCollisionBoxes.map((box, index) => (
        <DynamicRobotCollisionBox
          key={`${box.name}-${index}`}
          size={box.size}
          name={box.name}
          robot={robot}
          linkName={box.linkName}
        />
      ))}
      
      {/* Detailed jaw collision boxes */}
      {jawCollisionBoxes.map((box, index) => (
        <DetailedJawCollisionBox
          key={`${box.name}-${index}`}
          box={box}
          robot={robot}
        />
      ))}
    </>
  );
} 