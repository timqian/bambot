"use client";
import React, { useMemo } from "react";
import * as THREE from "three";

// Function to create grid texture (moved from RobotLoader.tsx)
function createGridTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const context = canvas.getContext("2d");

  if (context) {
    // Fill background
    context.fillStyle = "#aaa"; // Grey background
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    context.lineWidth = 8; // Line width
    context.strokeStyle = "#707070"; // Darker grey lines
    const gridSize = 500; // Size of each grid cell

    for (let i = 0; i <= canvas.width; i += gridSize) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, canvas.height);
      context.stroke();
    }
    for (let j = 0; j <= canvas.height; j += gridSize) {
      context.beginPath();
      context.moveTo(0, j);
      context.lineTo(canvas.width, j);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Adjust repeat based on the plane size and desired grid density
  texture.repeat.set(100, 100); // Example: Repeat texture to cover the 30x30 plane
  return texture;
}

export function GroundPlane() {
  const gridTexture = useMemo(() => createGridTexture(), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {/* Increase plane size by 10x */}
      <planeGeometry args={[30, 30]} />
      <meshPhysicalMaterial
        color={0x808080}
        metalness={0.7}
        roughness={0.3}
        reflectivity={0.1}
        clearcoat={0.3}
        side={THREE.DoubleSide}
        transparent={true}
        opacity={0.7}
        map={gridTexture} // Apply the grid texture
      />
    </mesh>
  );
}
