"use client";
import React from "react";

type DirectionalButtonProps = {
  direction: "up" | "down" | "left" | "right";
  onMouseDown: () => void;
  onMouseUp: () => void;
};

const directionSymbols: Record<"up" | "down" | "left" | "right", string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export const DirectionalButton: React.FC<
  DirectionalButtonProps & { isActive: boolean }
> = ({ direction, onMouseDown, onMouseUp, isActive }) => {
  return (
    <button
      className={`bg-gray-700 hover:bg-gray-500 text-gray-200 px-2 py-1 rounded font-bold ${
        isActive ? "bg-blue-500" : ""
      }`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {directionSymbols[direction]}
    </button>
  );
};
