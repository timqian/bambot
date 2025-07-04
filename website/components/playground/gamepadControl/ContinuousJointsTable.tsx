import React, { useEffect, useState, useCallback } from "react";
import {
  JointState,
  UpdateJointSpeed,
  UpdateJointsSpeed,
} from "../../../hooks/useRobotControl";
import { DirectionalButton } from "./DirectionalButton";

type ContinuousJointsTableProps = {
  joints: JointState[];
  updateJointSpeed: UpdateJointSpeed;
  updateJointsSpeed: UpdateJointsSpeed;
  maxSpeed: number;
};

const formatSpeed = (speed?: number | "N/A" | "error") => {
  if (speed === "error") {
    return <span className="text-red-500">Error</span>;
  }
  if (typeof speed === "number") {
    return speed.toFixed(0);
  }
  return "/";
};

export function ContinuousJointsTable({
  joints,
  updateJointSpeed,
  updateJointsSpeed,
  maxSpeed,
}: ContinuousJointsTableProps) {
  const [gamepadState, setGamepadState] = useState<string | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState(false);

  const handleGamepadMovement = useCallback(
    (direction: string) => {
      setGamepadState(direction);

      // Scale maxSpeed (1-50) to servo speed range
      // STS3215 servos support -10000 to +10000, but typical range is -2500 to +2500
      // Map slider 1-50 to speed 50-2500 (50x multiplier gives good range)
      const scaledSpeed = maxSpeed * 50;

      switch (direction) {
        case "forward":
          updateJointsSpeed([
            { servoId: joints[0].servoId!, speed: -scaledSpeed },
            { servoId: joints[2].servoId!, speed: scaledSpeed },
          ]);
          break;
        case "backward":
          updateJointsSpeed([
            { servoId: joints[0].servoId!, speed: scaledSpeed },
            { servoId: joints[2].servoId!, speed: -scaledSpeed },
          ]);
          break;
        case "left":
          updateJointsSpeed(
            joints.map((joint) => ({
              servoId: joint.servoId!,
              speed: scaledSpeed,
            }))
          );
          break;
        case "right":
          updateJointsSpeed(
            joints.map((joint) => ({
              servoId: joint.servoId!,
              speed: -scaledSpeed,
            }))
          );
          break;
        default:
          break;
      }
    },
    [joints, updateJointsSpeed, maxSpeed]
  );

  const handleGamepadStop = useCallback(() => {
    setGamepadState(null);
    updateJointsSpeed(
      joints.map((joint) => ({ servoId: joint.servoId!, speed: 0 }))
    );
  }, [joints, updateJointsSpeed]);

  // Gamepad polling effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[0]; // Use first connected gamepad

      if (gamepad) {
        setGamepadConnected(true);

        // Check D-pad for movement
        const dpadUp = gamepad.buttons[12]?.pressed;
        const dpadDown = gamepad.buttons[13]?.pressed;
        const dpadLeft = gamepad.buttons[14]?.pressed;
        const dpadRight = gamepad.buttons[15]?.pressed;

        // Check left stick for movement
        const leftStickX = gamepad.axes[0];
        const leftStickY = gamepad.axes[1];

        // Apply deadzone
        const deadzone = 0.2;
        const stickForward = leftStickY < -deadzone;
        const stickBackward = leftStickY > deadzone;
        const stickLeft = leftStickX < -deadzone;
        const stickRight = leftStickX > deadzone;

        if (dpadUp || stickForward) {
          if (gamepadState !== "forward") {
            handleGamepadMovement("forward");
          }
        } else if (dpadDown || stickBackward) {
          if (gamepadState !== "backward") {
            handleGamepadMovement("backward");
          }
        } else if (dpadLeft || stickLeft) {
          if (gamepadState !== "left") {
            handleGamepadMovement("left");
          }
        } else if (dpadRight || stickRight) {
          if (gamepadState !== "right") {
            handleGamepadMovement("right");
          }
        } else {
          if (gamepadState !== null) {
            handleGamepadStop();
          }
        }
      } else {
        setGamepadConnected(false);
        if (gamepadState !== null) {
          handleGamepadStop();
        }
      }
    };

    intervalId = setInterval(pollGamepad, 16); // ~60fps

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [gamepadState, handleGamepadMovement, handleGamepadStop]); // Include callbacks in dependencies

  return (
    <div className="mt-4 relative">
      <h4 className="text-sm font-semibold mb-2 text-zinc-300">
        Continuous Joints (Wheels) - Speed: {maxSpeed * 50} / 2500
      </h4>

      {/* Gamepad status */}
      <div className="mb-2 text-xs">
        <span className={gamepadConnected ? "text-green-400" : "text-red-400"}>
          Gamepad: {gamepadConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="flex">
        <div className="flex-1">
          <table className="table-auto w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-zinc-600 pb-1 pr-2">Joint</th>
                <th className="border-b border-zinc-600 pb-1 text-center pl-2">
                  Speed
                </th>
              </tr>
            </thead>
            <tbody>
              {joints.map((detail) => (
                <tr key={detail.servoId}>
                  <td className="pr-2">{detail.name}</td>
                  <td className="pr-2 text-center w-16">
                    {formatSpeed(detail.speed)}
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
              onMouseDown={() => handleGamepadMovement("forward")}
              onMouseUp={handleGamepadStop}
              isActive={gamepadState === "forward"}
            />
            <div className="flex gap-1">
              <DirectionalButton
                direction="left"
                onMouseDown={() => handleGamepadMovement("left")}
                onMouseUp={handleGamepadStop}
                isActive={gamepadState === "left"}
              />
              <DirectionalButton
                direction="down"
                onMouseDown={() => handleGamepadMovement("backward")}
                onMouseUp={handleGamepadStop}
                isActive={gamepadState === "backward"}
              />
              <DirectionalButton
                direction="right"
                onMouseDown={() => handleGamepadMovement("right")}
                onMouseUp={handleGamepadStop}
                isActive={gamepadState === "right"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
