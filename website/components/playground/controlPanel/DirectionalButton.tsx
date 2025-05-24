"use client";
import React from "react";

type DirectionalButtonProps = {
  direction: "up" | "down" | "left" | "right";
  onMouseDown: () => void;
  onMouseUp: () => void;
  isActive: boolean;
};

const symbols = { up: "↑", down: "↓", left: "←", right: "→" };

export const DirectionalButton: React.FC<DirectionalButtonProps> = ({
  direction,
  onMouseDown,
  onMouseUp,
  isActive,
}) => (
  <button
    className={`text-gray-200 px-2 py-1 rounded font-bold select-none ${
      isActive ? "bg-blue-500" : "bg-gray-700 hover:bg-gray-500"
    }`}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
    onTouchStart={(e) => {
      e.preventDefault();
      onMouseDown();
    }}
    onTouchEnd={(e) => {
      e.preventDefault();
      onMouseUp();
    }}
    style={{ WebkitUserSelect: "none", userSelect: "none" }}
  >
    {symbols[direction]}
  </button>
);
