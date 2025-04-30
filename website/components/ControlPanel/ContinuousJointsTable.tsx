import React, { useEffect, useState } from "react";
import {
  JointState,
  UpdateJointSpeed,
  UpdateJointsSpeed,
} from "../../hooks/useRobotControl";
import { DirectionalButton } from "./DirectionalButton";

type ContinuousJointsTableProps = {
  joints: JointState[];
  updateJointSpeed: UpdateJointSpeed;
  updateJointsSpeed: UpdateJointsSpeed; // Add updateJointsSpeed prop
  maxSpeed: number;
};

const formatVirtualSpeed = (speed?: number) =>
  speed !== undefined ? speed.toFixed(0) : "/";
const formatRealSpeed = (speed?: number | "N/A" | "error") => {
  if (speed === "error") {
    return <span className="text-red-500">Error</span>;
  }
  return speed === "N/A" ? "/" : `${speed?.toFixed(0)}`;
};

export function ContinuousJointsTable({
  joints,
  updateJointSpeed,
  updateJointsSpeed,
}: ContinuousJointsTableProps) {
  const maxSpeed = 1000; // Define max speed for the robot
  const [keyState, setKeyState] = useState<string | null>(null); // Track current key state

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowUp":
        setKeyState("forward");
        updateJointsSpeed([
          { servoId: joints[0].servoId!, speed: -maxSpeed },
          { servoId: joints[2].servoId!, speed: maxSpeed },
        ]);
        break;
      case "ArrowDown":
        setKeyState("backward");
        updateJointsSpeed([
          { servoId: joints[0].servoId!, speed: maxSpeed },
          { servoId: joints[2].servoId!, speed: -maxSpeed },
        ]);
        break;
      case "ArrowLeft":
        setKeyState("left");
        updateJointsSpeed(
          joints.map((joint) => ({ servoId: joint.servoId!, speed: maxSpeed }))
        );
        break;
      case "ArrowRight":
        setKeyState("right");
        updateJointsSpeed(
          joints.map((joint) => ({ servoId: joint.servoId!, speed: -maxSpeed }))
        );
        break;
      default:
        break;
    }
  };

  const handleKeyUp = () => {
    setKeyState(null);
    updateJointsSpeed(
      joints.map((joint) => ({ servoId: joint.servoId!, speed: 0 }))
    );
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [joints, maxSpeed]);

  return (
    <div className="mt-4 flex relative">
      {/* Wheel Status Table */}
      <div className="flex-1">
        <table className="table-auto w-full text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-gray-600 pb-1 pr-2"><span className="text-gray-600">id </span> Wheel</th>
              <th className="border-b border-gray-600 pb-1 text-center px-2">
                Speed
              </th>
              <th className="border-b border-gray-600 pb-1 text-center px-2">
                Real Speed
              </th>
              <th className="px-8 border-b border-gray-600">Control</th>
            </tr>
          </thead>
          <tbody>
            {joints.map((detail) => (
              <tr key={detail.servoId}>
                <td className="py-1">
                  <span className="text-gray-600">{detail.servoId}</span>{" "}
                  {detail.name}
                </td>
                <td className="py-1 pr-2 text-center">
                  {formatVirtualSpeed(detail.virtualSpeed)}
                </td>
                <td className="py-1 pl-2 text-center">
                  {formatRealSpeed(detail.realSpeed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Directional Control Section */}
      <div className="absolute right-3 top-10">
        <div className="flex flex-col items-center gap-1">
          <DirectionalButton
            direction="up"
            onMouseDown={() =>
              handleKeyDown({ key: "ArrowUp" } as KeyboardEvent)
            }
            onMouseUp={handleKeyUp}
            isActive={keyState === "forward"}
          />
          <div className="flex gap-1">
            <DirectionalButton
              direction="left"
              onMouseDown={() =>
                handleKeyDown({ key: "ArrowLeft" } as KeyboardEvent)
              }
              onMouseUp={handleKeyUp}
              isActive={keyState === "left"}
            />
            <DirectionalButton
              direction="down"
              onMouseDown={() =>
                handleKeyDown({ key: "ArrowDown" } as KeyboardEvent)
              }
              onMouseUp={handleKeyUp}
              isActive={keyState === "backward"}
            />
            <DirectionalButton
              direction="right"
              onMouseDown={() =>
                handleKeyDown({ key: "ArrowRight" } as KeyboardEvent)
              }
              onMouseUp={handleKeyUp}
              isActive={keyState === "right"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
