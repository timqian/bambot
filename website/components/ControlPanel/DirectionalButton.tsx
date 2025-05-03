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
  console.log(isActive);
  const handleTouchStart = (event: React.TouchEvent) => {
    event.preventDefault(); // Prevent text selection on long press
    onMouseDown();
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault(); // Prevent text selection on long press
    onMouseUp();
  };

  return (
    <button
      className={`text-gray-200 px-2 py-1 rounded font-bold select-none ${
        isActive ? "bg-blue-500" : "bg-gray-700 hover:bg-gray-500"
      }`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={handleTouchStart} // Updated to use handler
      onTouchEnd={handleTouchEnd} // Updated to use handler
      style={{ WebkitUserSelect: "none", userSelect: "none" }} // Added inline styles for WebKit
    >
      {directionSymbols[direction]}
    </button>
  );
};
