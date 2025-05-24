"use client";
import React, { useMemo } from "react";
import * as THREE from "three";

function createGridTexture() {
  const size = 200;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#707070";
    ctx.lineWidth = 8;
    // Draw border grid lines only (since gridSize > canvas size)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(size, size);
    ctx.lineTo(size, 0);
    ctx.closePath();
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);
  return texture;
}

export function GroundPlane() {
  const gridTexture = useMemo(createGridTexture, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshPhysicalMaterial
        color={0x808080}
        metalness={0.7}
        roughness={0.3}
        reflectivity={0.1}
        clearcoat={0.3}
        side={THREE.DoubleSide}
        transparent
        opacity={0.7}
        map={gridTexture}
      />
    </mesh>
  );
}
