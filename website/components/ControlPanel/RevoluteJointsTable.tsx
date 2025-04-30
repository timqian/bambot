"use client";
import Oeact, { useState, useEffect, useRef } from "react"; // Added useRef
import {
  JointState,
  UpdateJointDegrees,
  UpdateJointsDegrees,
} from "../../hooks/useRobotControl";
import { radiansToDegrees } from "../../lib/utils";
import { RobotConfig } from "@/config/robotConfig";

type RevoluteJointsTableProps = {
  joints: JointState[];
  updateJointDegrees: UpdateJointDegrees;
  updateJointsDegrees: UpdateJointsDegrees;
  keyboardControlMap: RobotConfig["keyboardControlMap"];
};

// Define constants for interval and step size
const KEY_UPDATE_INTERVAL_MS = 3;
const KEY_UPDATE_STEP_DEGREES = 0.15;

const formatVirtualDegrees = (degrees?: number) =>
  degrees !== undefined
    ? `${degrees > 0 ? "+" : ""}${degrees.toFixed(1)}°`
    : "/";
const formatRealDegrees = (degrees?: number | "N/A" | "error") => {
  if (degrees === "error") {
    return <span className="text-red-500">Error</span>;
  }
  return degrees === "N/A" ? "/" : `${degrees?.toFixed(1)}°`;
};

export function RevoluteJointsTable({
  joints,
  updateJointDegrees,
  updateJointsDegrees,
  keyboardControlMap,
}: RevoluteJointsTableProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  // Refs to hold the latest values needed inside the interval callback
  const jointsRef = useRef(joints);
  const updateJointsDegreesRef = useRef(updateJointsDegrees);
  const keyboardControlMapRef = useRef(keyboardControlMap);

  // Update refs whenever the props change
  useEffect(() => {
    jointsRef.current = joints;
  }, [joints]);

  useEffect(() => {
    updateJointsDegreesRef.current = updateJointsDegrees;
  }, [updateJointsDegrees]);

  useEffect(() => {
    keyboardControlMapRef.current = keyboardControlMap;
  }, [keyboardControlMap]);

  // Effect for keyboard listeners
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is actually used for control to potentially prevent default
      // Note: Using the ref here ensures we check against the *latest* map
      const isControlKey = Object.values(keyboardControlMapRef.current || {})
        .flat()
        .includes(event.key);
      if (isControlKey) {
        // event.preventDefault(); // Optional: uncomment if keys like arrows scroll the page
      }
      setPressedKeys((prevKeys) => new Set(prevKeys).add(event.key));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setPressedKeys((prevKeys) => {
        const newKeys = new Set(prevKeys);
        newKeys.delete(event.key);
        return newKeys;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []); // Empty dependency array: sets up listeners once

  // Effect for handling continuous updates when keys are pressed
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    // Define the function to be called by the interval
    const updateJointsBasedOnKeys = () => {
      // Access latest values via refs inside the interval
      const currentJoints = jointsRef.current;
      const currentControlMap = keyboardControlMapRef.current || {};
      // Read the current pressed keys directly from the state captured by the effect's closure
      const currentPressedKeys = pressedKeys;

      const updates = currentJoints
        .map((joint) => {
          const decreaseKey = currentControlMap[joint.servoId!]?.[1];
          const increaseKey = currentControlMap[joint.servoId!]?.[0];
          let currentDegrees = joint.virtualDegrees || 0;
          let newValue = currentDegrees;

          if (decreaseKey && currentPressedKeys.has(decreaseKey)) {
            newValue -= KEY_UPDATE_STEP_DEGREES; // Use constant
          }
          if (increaseKey && currentPressedKeys.has(increaseKey)) {
            newValue += KEY_UPDATE_STEP_DEGREES; // Use constant
          }

          // Clamp value within joint limits
          const lowerLimit = Math.round(
            radiansToDegrees(joint.limit?.lower ?? -Infinity)
          );
          const upperLimit = Math.round(
            radiansToDegrees(joint.limit?.upper ?? Infinity)
          );
          newValue = Math.max(lowerLimit, Math.min(upperLimit, newValue));

          if (newValue !== currentDegrees) {
            return { servoId: joint.servoId!, value: newValue };
          }
          return null;
        })
        .filter((update) => update !== null) as {
        servoId: number;
        value: number;
      }[];

      if (updates.length > 0) {
        // Call update function using ref
        updateJointsDegreesRef.current(updates);
      }
    };

    if (pressedKeys.size > 0) {
      // Start interval only if keys are pressed
      intervalId = setInterval(updateJointsBasedOnKeys, KEY_UPDATE_INTERVAL_MS); // Use constant
    }

    // Cleanup function: clears interval when effect re-runs (pressedKeys changes) or component unmounts
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pressedKeys]); // Re-run this effect only when pressedKeys changes

  // Mouse handlers update the `pressedKeys` state, which triggers the interval effect
  const handleMouseDown = (key: string | undefined) => {
    if (key) {
      setPressedKeys((prevKeys) => new Set(prevKeys).add(key));
    }
  };

  const handleMouseUp = (key: string | undefined) => {
    if (key) {
      setPressedKeys((prevKeys) => {
        const newKeys = new Set(prevKeys);
        newKeys.delete(key);
        return newKeys;
      });
    }
  };

  // Component rendering uses the `joints` prop for display
  return (
    <div className="mt-4">
      <table className="table-auto w-full text-left text-sm">
        <thead>
          {/* ... existing table head ... */}
          <tr>
            <th className="border-b border-gray-600 pb-1 pr-2">Joint</th>
            <th className="border-b border-gray-600 pb-1 text-center pl-2">
              Angle
            </th>
            <th className="border-b border-gray-600 pb-1 text-center pl-2">
              Real Angle
            </th>
            <th className="border-b border-gray-600 pb-1 text-center px-2">
              Control
            </th>
          </tr>
        </thead>
        <tbody>
          {joints.map((detail) => {
            // Use `joints` prop for rendering current state
            const decreaseKey = keyboardControlMap[detail.servoId!]?.[1];
            const increaseKey = keyboardControlMap[detail.servoId!]?.[0];
            const isDecreaseActive =
              decreaseKey && pressedKeys.has(decreaseKey);
            const isIncreaseActive =
              increaseKey && pressedKeys.has(increaseKey);

            return (
              <tr key={detail.servoId}>
                <td className="">
                  {/* <span className="text-gray-600">{detail.servoId}</span>{" "} */}
                  {detail.name}
                </td>

                <td className="pr-2 text-center w-16">
                  {formatVirtualDegrees(detail.virtualDegrees)}
                </td>
                <td className="pl-2 text-center w-16">
                  {formatRealDegrees(detail.realDegrees)}
                </td>
                <td className="py-1 px-4 flex items-center">
                  <button
                    onMouseDown={() => handleMouseDown(decreaseKey)}
                    onMouseUp={() => handleMouseUp(decreaseKey)}
                    onMouseLeave={() => handleMouseUp(decreaseKey)} // Optional: stop if mouse leaves button while pressed
                    onTouchStart={() => handleMouseDown(decreaseKey)} // Optional: basic touch support
                    onTouchEnd={() => handleMouseUp(decreaseKey)} // Optional: basic touch support
                    className={`${
                      isDecreaseActive
                        ? "bg-blue-600"
                        : "bg-gray-700 hover:bg-gray-600"
                    } text-white text-xs font-bold w-5 h-5 text-right pr-1 uppercase select-none`} // Added select-none
                    style={{
                      clipPath:
                        "polygon(0 50%, 30% 0, 100% 0, 100% 100%, 30% 100%)",
                    }}
                  >
                    {decreaseKey || "-"}
                  </button>
                  <input
                    type="range"
                    min={Math.round(
                      radiansToDegrees(detail.limit?.lower ?? -Math.PI)
                    )}
                    max={Math.round(
                      radiansToDegrees(detail.limit?.upper ?? Math.PI)
                    )}
                    step="0.1"
                    value={detail.virtualDegrees || 0}
                    // Note: onChange is only triggered by user sliding the range input,
                    // not when the `value` prop changes programmatically (e.g., via button clicks).
                    onChange={(e) => {
                      const valueInDegrees = parseFloat(e.target.value);
                      updateJointDegrees(detail.servoId!, valueInDegrees);
                    }}
                    className="h-2 bg-gray-700 appearance-none cursor-pointer w-14"
                  />
                  <button
                    onMouseDown={() => handleMouseDown(increaseKey)}
                    onMouseUp={() => handleMouseUp(increaseKey)}
                    onMouseLeave={() => handleMouseUp(increaseKey)} // Optional
                    onTouchStart={() => handleMouseDown(increaseKey)} // Optional
                    onTouchEnd={() => handleMouseUp(increaseKey)} // Optional
                    className={`${
                      isIncreaseActive
                        ? "bg-blue-600"
                        : "bg-gray-700 hover:bg-gray-600"
                    } text-white text-xs font-semibold w-5 h-5 text-left pl-1 uppercase select-none`} // Added select-none
                    style={{
                      clipPath:
                        "polygon(100% 50%, 70% 0, 0 0, 0 100%, 70% 100%)",
                    }}
                  >
                    {increaseKey || "+"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
