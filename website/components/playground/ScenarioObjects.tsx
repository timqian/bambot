import React, { useRef, useState } from 'react';
import { useBox, usePointToPointConstraint } from '@react-three/cannon';
import { ScenarioObject } from '@/lib/scenarios';
import * as THREE from 'three';

interface ScenarioObjectsProps {
  objects: ScenarioObject[];
}

function ScenarioObjectComponent({ object }: { object: ScenarioObject }) {
  const { type, position, rotation = [0, 0, 0], scale = [1, 1, 1], color } = object;
  const [hovered, setHovered] = useState(false);
  const [isGripped, setIsGripped] = useState(false);
  const constraintRef = useRef<any>(null);
  
  // Create physics body for collision detection
  const [ref, api] = useBox(() => ({
    mass: 0.5, // Reduced mass for easier manipulation
    position: position as [number, number, number],
    rotation: rotation as [number, number, number],
    args: scale as [number, number, number], // Box dimensions
    material: {
      friction: 1.2, // Increased friction significantly for better grip
      restitution: 0.05, // Very low bounce to prevent objects from bouncing away
      frictionEquation: {
        relaxation: 3, // Higher relaxation for more stable contact
        stiffness: 1e8, // High stiffness for solid feel
      },
      contactEquation: {
        relaxation: 3, // More stable contacts
        stiffness: 1e8, // Prevent sinking/bouncing
      }
    },
    linearDamping: 0.6, // Increased damping to reduce jittery movement
    angularDamping: 0.6, // Increased to reduce rotation jitter when gripped
    sleepSpeedLimit: 0.1, // Objects go to sleep when moving slowly, making them easier to grip
    sleepTimeLimit: 0.1, // Quick sleep transition
    allowSleep: true, // Enable sleeping for stable gripping
    fixedRotation: false, // Allow rotation but will be damped
    // Add collision groups for better interaction with robot parts
    collisionFilterGroup: 2, // Object collision group
    collisionFilterMask: -1, // Collide with everything
    onCollide: (e: any) => {
      // Simple gripping logic - if colliding with robot jaw, reduce movement
      if (e.body && !isGripped) {
        // Make object "stickier" when touched by robot
        api.linearDamping.set(0.9);
        api.angularDamping.set(0.9);
        
        // Reduce sleep limits to make it easier to pick up
        api.sleepSpeedLimit.set(0.05);
        
        setTimeout(() => {
          if (!isGripped) {
            // Reset if not gripped after brief contact
            api.linearDamping.set(0.6);
            api.angularDamping.set(0.6);
            api.sleepSpeedLimit.set(0.1);
          }
        }, 500);
      }
    }
  }));

  const material = (
    <meshStandardMaterial 
      color={hovered ? '#ffffff' : color} 
      transparent
      opacity={hovered ? 0.8 : 1.0}
    />
  );

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);
  
  // Handle click to apply force (simulate picking up)
  const handleClick = () => {
    // Apply upward force when clicked
    api.applyImpulse([0, 5, 0], [0, 0, 0]);
  };

  const commonProps = {
    ref: ref as any,
    castShadow: true,
    receiveShadow: true,
    onPointerOver: handlePointerOver,
    onPointerOut: handlePointerOut,
    onClick: handleClick,
    scale: scale as [number, number, number],
  };

  switch (type) {
    case 'cube':
      return (
        <mesh {...commonProps}>
          <boxGeometry args={[1, 1, 1]} />
          {material}
        </mesh>
      );
    case 'sphere':
      return (
        <mesh {...commonProps}>
          <sphereGeometry args={[0.5, 32, 32]} />
          {material}
        </mesh>
      );
    case 'cylinder':
      return (
        <mesh {...commonProps}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          {material}
        </mesh>
      );
    default:
      return null;
  }
}

export function ScenarioObjects({ objects }: ScenarioObjectsProps) {
  return (
    <>
      {objects.map((object) => (
        <ScenarioObjectComponent key={object.id} object={object} />
      ))}
    </>
  );
} 