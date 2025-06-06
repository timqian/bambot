import React, { useRef, useState } from 'react';
import { useBox } from '@react-three/cannon';
import { ScenarioObject } from '@/lib/scenarios';
import * as THREE from 'three';

interface ScenarioObjectsProps {
  objects: ScenarioObject[];
}

function ScenarioObjectComponent({ object }: { object: ScenarioObject }) {
  const { type, position, rotation = [0, 0, 0], scale = [1, 1, 1], color } = object;
  const [hovered, setHovered] = useState(false);
  
  // Create physics body for collision detection
  const [ref, api] = useBox(() => ({
    mass: 1, // Make it moveable
    position: position as [number, number, number],
    rotation: rotation as [number, number, number],
    args: scale as [number, number, number], // Box dimensions
    material: {
      friction: 0.8, // Higher friction for better grip (0.8 is very good for pickup)
      restitution: 0.1, // Lower bounce to reduce juddering
    },
    linearDamping: 0.4, // Add damping to reduce jittery movement
    angularDamping: 0.4, // Reduce rotation jitter when gripped
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