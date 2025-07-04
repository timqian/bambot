"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  JointState,
  UpdateJointDegrees,
  UpdateJointsDegrees,
} from "../../../hooks/useRobotControl";
import { radiansToDegrees } from "../../../lib/utils";
import { RobotConfig } from "@/config/robotConfig";

type RevoluteJointsTableProps = {
  joints: JointState[];
  updateJointDegrees: UpdateJointDegrees;
  updateJointsDegrees: UpdateJointsDegrees;
  gamepadControlMap: RobotConfig["gamepadControlMap"];
  compoundMovements?: RobotConfig["compoundMovements"];
};

// Define constants for interval and step size
const GAMEPAD_UPDATE_INTERVAL_MS = 16; // ~60fps for smooth control
const GAMEPAD_UPDATE_STEP_DEGREES = 0.3;

const formatDegrees = (degrees?: number | "N/A" | "error") => {
  if (degrees === "error") {
    return <span className="text-red-500">Error</span>;
  }
  if (typeof degrees === "number") {
    return `${degrees.toFixed(1)}°`;
  }
  return "/";
};

// Gamepad button and axis mappings
const GAMEPAD_BUTTON_NAMES: { [key: number]: string } = {
  0: "A",
  1: "B",
  2: "X",
  3: "Y",
  4: "LB",
  5: "RB",
  6: "LT",
  7: "RT",
  8: "Back",
  9: "Start",
  10: "LS",
  11: "RS",
  12: "Up",
  13: "Down",
  14: "Left",
  15: "Right",
};

const GAMEPAD_AXIS_NAMES: { [key: number]: string } = {
  0: "LS-X",
  1: "LS-Y",
  2: "RS-X",
  3: "RS-Y",
};

export function RevoluteJointsTable({
  joints,
  updateJointDegrees,
  updateJointsDegrees,
  gamepadControlMap,
  compoundMovements,
}: RevoluteJointsTableProps) {
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());
  const [axisValues, setAxisValues] = useState<{ [key: string]: number }>({});
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Refs to hold the latest values needed inside the interval callback
  const jointsRef = useRef(joints);
  const updateJointsDegreesRef = useRef(updateJointsDegrees);
  const gamepadControlMapRef = useRef(gamepadControlMap);

  // Update refs whenever the props change
  useEffect(() => {
    jointsRef.current = joints;
  }, [joints]);

  useEffect(() => {
    updateJointsDegreesRef.current = updateJointsDegrees;
  }, [updateJointsDegrees]);

  useEffect(() => {
    gamepadControlMapRef.current = gamepadControlMap;
  }, [gamepadControlMap]);

  // Gamepad polling effect - runs continuously to detect gamepad state
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[0]; // Use first connected gamepad

      if (gamepad) {
        setGamepadConnected(true);

        // Check buttons
        const newPressedButtons = new Set<string>();
        gamepad.buttons.forEach((button, index) => {
          if (button.pressed) {
            const buttonName = GAMEPAD_BUTTON_NAMES[index] || `Button${index}`;
            newPressedButtons.add(buttonName);
          }
        });

        // Check axes
        const newAxisValues: { [key: string]: number } = {};
        gamepad.axes.forEach((value, index) => {
          const axisName = GAMEPAD_AXIS_NAMES[index] || `Axis${index}`;
          // Apply deadzone
          const processedValue = Math.abs(value) > 0.1 ? value : 0;
          newAxisValues[axisName] = processedValue;
        });

        // Update state only if there are changes to avoid unnecessary re-renders
        setPressedButtons((prev) => {
          const hasChanges =
            prev.size !== newPressedButtons.size ||
            [...newPressedButtons].some((btn) => !prev.has(btn)) ||
            [...prev].some((btn) => !newPressedButtons.has(btn));
          return hasChanges ? newPressedButtons : prev;
        });

        setAxisValues((prev) => {
          const hasChanges =
            Object.keys(newAxisValues).some(
              (key) => prev[key] !== newAxisValues[key]
            ) ||
            Object.keys(prev).some(
              (key) => !(key in newAxisValues) && prev[key] !== 0
            );
          return hasChanges ? newAxisValues : prev;
        });
      } else {
        setGamepadConnected(false);
        setPressedButtons((prev) => (prev.size > 0 ? new Set() : prev));
        setAxisValues((prev) => (Object.keys(prev).length > 0 ? {} : prev));
      }
    };

    intervalId = setInterval(pollGamepad, GAMEPAD_UPDATE_INTERVAL_MS);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array - runs once and continuously polls

  // Effect for handling continuous updates when buttons are pressed or axes moved
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const updateJointsBasedOnGamepad = () => {
      const currentJoints = jointsRef.current;
      const currentControlMap = gamepadControlMapRef.current || {};
      const currentCompoundMovements = compoundMovements || [];

      // Check if there's any input to process
      const hasButtonInput = pressedButtons.size > 0;
      const hasAxisInput = Object.values(axisValues).some(
        (v) => Math.abs(v) > 0.05
      );

      if (!hasButtonInput && !hasAxisInput) {
        return; // No input to process
      }

      // Normal single joint control
      let updates = currentJoints
        .map((joint) => {
          const controls = currentControlMap[joint.servoId!];
          if (!controls) {
            return null;
          }

          let currentDegrees =
            typeof joint.degrees === "number" ? joint.degrees : 0;
          let newValue = currentDegrees;

          // Check button controls
          if (controls.buttons) {
            const [increaseButton, decreaseButton] = controls.buttons;
            if (decreaseButton && pressedButtons.has(decreaseButton)) {
              newValue -= GAMEPAD_UPDATE_STEP_DEGREES;
            }
            if (increaseButton && pressedButtons.has(increaseButton)) {
              newValue += GAMEPAD_UPDATE_STEP_DEGREES;
            }
          }

          // Check axis controls
          if (controls.axis) {
            const axisValue = axisValues[controls.axis];
            if (axisValue !== undefined && Math.abs(axisValue) > 0.05) {
              newValue += axisValue * GAMEPAD_UPDATE_STEP_DEGREES * 2;
            }
          }

          const lowerLimit = Math.round(
            radiansToDegrees(joint.limit?.lower ?? -Infinity)
          );
          const upperLimit = Math.round(
            radiansToDegrees(joint.limit?.upper ?? Infinity)
          );
          newValue = Math.max(lowerLimit, Math.min(upperLimit, newValue));

          if (Math.abs(newValue - currentDegrees) > 0.01) {
            return { servoId: joint.servoId!, value: newValue };
          }
          return null;
        })
        .filter((update) => update !== null) as {
        servoId: number;
        value: number;
      }[];

      // Handle compound movements
      currentCompoundMovements.forEach((cm) => {
        const pressedIdx = cm.keys.findIndex((k) => pressedButtons.has(k));
        if (pressedIdx === -1) return;

        const primaryJoint = currentJoints.find(
          (j) => j.servoId === cm.primaryJoint
        );
        if (!primaryJoint) return;

        const primary =
          typeof primaryJoint.degrees === "number" ? primaryJoint.degrees : 0;

        let sign = 1;
        if (cm.primaryFormula) {
          try {
            sign =
              Math.sign(
                Function(
                  "primary",
                  "dependent",
                  "delta",
                  `return ${cm.primaryFormula}`
                )(primary, 0, GAMEPAD_UPDATE_STEP_DEGREES)
              ) || 1;
          } catch (e) {
            sign = 1;
          }
        } else {
          sign = pressedIdx === 0 ? 1 : -1;
        }

        const deltaPrimary =
          GAMEPAD_UPDATE_STEP_DEGREES * sign * (pressedIdx === 0 ? 1 : -1);

        let newPrimaryValue = primary + deltaPrimary;
        const lowerLimit = Math.round(
          radiansToDegrees(primaryJoint.limit?.lower ?? -Infinity)
        );
        const upperLimit = Math.round(
          radiansToDegrees(primaryJoint.limit?.upper ?? Infinity)
        );
        newPrimaryValue = Math.max(
          lowerLimit,
          Math.min(upperLimit, newPrimaryValue)
        );

        const updatesMap = new Map<number, number>();
        updates.forEach((u) => updatesMap.set(u.servoId, u.value));
        updatesMap.set(primaryJoint.servoId!, newPrimaryValue);

        cm.dependents.forEach((dep) => {
          const dependentJoint = currentJoints.find(
            (j) => j.servoId === dep.joint
          );
          if (!dependentJoint) return;

          const dependent =
            typeof dependentJoint.degrees === "number"
              ? dependentJoint.degrees
              : 0;

          let deltaDependent = 0;
          try {
            deltaDependent = Function(
              "primary",
              "dependent",
              "deltaPrimary",
              `return ${dep.formula}`
            )(primary, dependent, deltaPrimary);
          } catch (e) {
            console.error("Error evaluating dependent formula:", e);
            deltaDependent = 0;
          }

          let newDependentValue = dependent + deltaDependent;
          const depLowerLimit = Math.round(
            radiansToDegrees(dependentJoint.limit?.lower ?? -Infinity)
          );
          const depUpperLimit = Math.round(
            radiansToDegrees(dependentJoint.limit?.upper ?? Infinity)
          );
          newDependentValue = Math.max(
            depLowerLimit,
            Math.min(depUpperLimit, newDependentValue)
          );
          updatesMap.set(dependentJoint.servoId!, newDependentValue);
        });

        updates = Array.from(updatesMap.entries()).map(([servoId, value]) => ({
          servoId,
          value,
        }));
      });

      if (updates.length > 0) {
        updateJointsDegreesRef.current(updates);
      }
    };

    // Only start the interval if there's input to process
    const hasButtonInput = pressedButtons.size > 0;
    const hasAxisInput = Object.values(axisValues).some(
      (v) => Math.abs(v) > 0.05
    );

    if (hasButtonInput || hasAxisInput) {
      intervalId = setInterval(
        updateJointsBasedOnGamepad,
        GAMEPAD_UPDATE_INTERVAL_MS
      );
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pressedButtons, axisValues, compoundMovements]); // Re-run when gamepad state changes

  // Mouse handlers for manual button simulation
  const handleMouseDown = (button: string | undefined) => {
    if (button) {
      setPressedButtons((prevButtons) => new Set(prevButtons).add(button));
    }
  };

  const handleMouseUp = (button: string | undefined) => {
    if (button) {
      setPressedButtons((prevButtons) => {
        const newButtons = new Set(prevButtons);
        newButtons.delete(button);
        return newButtons;
      });
    }
  };

  return (
    <div className="mt-4">
      {/* Gamepad status */}
      <div className="mb-2 text-xs">
        <span className={gamepadConnected ? "text-green-400" : "text-red-400"}>
          Gamepad: {gamepadConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <table className="table-auto w-full text-left text-sm">
        <thead>
          <tr>
            <th className="border-b border-zinc-600 pb-1 pr-2">Joint</th>
            <th className="border-b border-zinc-600 pb-1 text-center pl-2">
              Angle
            </th>
            <th className="border-b border-zinc-600 pb-1 text-center px-2">
              Control
            </th>
          </tr>
        </thead>
        <tbody>
          {joints.map((detail) => {
            const controls = gamepadControlMap?.[detail.servoId!];
            const decreaseControl = controls?.buttons?.[1] || controls?.axis; // [1] is still decrease
            const increaseControl = controls?.buttons?.[0]; // [0] is still increase
            const isDecreaseActive =
              decreaseControl &&
              (pressedButtons.has(decreaseControl) ||
                (controls?.axis && axisValues[controls.axis] < -0.1));
            const isIncreaseActive =
              increaseControl &&
              (pressedButtons.has(increaseControl) ||
                (controls?.axis && axisValues[controls.axis] > 0.1));

            return (
              <tr key={detail.servoId}>
                <td className="">{detail.name}</td>

                <td className="pr-2 text-center w-16">
                  {formatDegrees(detail.degrees)}
                </td>

                <td className="py-1 px-4 flex items-center">
                  {controls?.buttons && (
                    <>
                      <button
                        onMouseDown={() => handleMouseDown(decreaseControl)}
                        onMouseUp={() => handleMouseUp(decreaseControl)}
                        onMouseLeave={() => handleMouseUp(decreaseControl)}
                        onTouchStart={() => handleMouseDown(decreaseControl)}
                        onTouchEnd={() => handleMouseUp(decreaseControl)}
                        className={`${
                          isDecreaseActive
                            ? "bg-blue-600"
                            : "bg-zinc-700 hover:bg-zinc-600"
                        } text-white text-xs font-bold h-5 text-center uppercase select-none mr-1 px-1`}
                        style={{
                          clipPath:
                            "polygon(0 50%, 30% 0, 100% 0, 100% 100%, 30% 100%)",
                          minWidth: "3em",
                          minHeight: "1.8em",
                          fontWeight: 600,
                          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
                        }}
                        tabIndex={-1}
                      >
                        {decreaseControl || "-"}
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
                        value={
                          typeof detail.degrees === "number"
                            ? detail.degrees
                            : 0
                        }
                        onChange={(e) => {
                          const valueInDegrees = parseFloat(e.target.value);
                          updateJointDegrees(detail.servoId!, valueInDegrees);
                        }}
                        className="h-2 bg-zinc-700 appearance-none cursor-pointer w-14 custom-range-thumb mx-1"
                      />

                      <button
                        onMouseDown={() => handleMouseDown(increaseControl)}
                        onMouseUp={() => handleMouseUp(increaseControl)}
                        onMouseLeave={() => handleMouseUp(increaseControl)}
                        onTouchStart={() => handleMouseDown(increaseControl)}
                        onTouchEnd={() => handleMouseUp(increaseControl)}
                        className={`${
                          isIncreaseActive
                            ? "bg-blue-600"
                            : "bg-zinc-700 hover:bg-zinc-600"
                        } text-white text-xs font-semibold h-5 text-center uppercase select-none ml-1 px-1`}
                        style={{
                          clipPath:
                            "polygon(100% 50%, 70% 0, 0 0, 0 100%, 70% 100%)",
                          minWidth: "3em",
                          minHeight: "1.8em",
                          fontWeight: 600,
                          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
                        }}
                        tabIndex={-1}
                      >
                        {increaseControl || "+"}
                      </button>
                    </>
                  )}

                  {controls?.axis && (
                    <div className="ml-2 text-xs text-zinc-400">
                      {controls.axis}:{" "}
                      {(axisValues[controls.axis] || 0).toFixed(2)}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Compound Movements */}
      {compoundMovements && compoundMovements.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2 text-zinc-300">
            Compound Movements
          </h4>
          <table className="table-auto w-full text-left text-sm">
            <tbody>
              {compoundMovements.map((cm, idx) => {
                const decreaseKey = cm.keys[1];
                const increaseKey = cm.keys[0];
                const isDecreaseActive =
                  decreaseKey && pressedButtons.has(decreaseKey);
                const isIncreaseActive =
                  increaseKey && pressedButtons.has(increaseKey);
                return (
                  <tr key={idx}>
                    <td className="font-semibold pr-2 align-top">{cm.name}</td>
                    <td>
                      {cm.keys && cm.keys.length > 0 && (
                        <span className="space-x-1 flex flex-row">
                          <button
                            onMouseDown={() => handleMouseDown(decreaseKey)}
                            onMouseUp={() => handleMouseUp(decreaseKey)}
                            onMouseLeave={() => handleMouseUp(decreaseKey)}
                            onTouchStart={() => handleMouseDown(decreaseKey)}
                            onTouchEnd={() => handleMouseUp(decreaseKey)}
                            className={`${
                              isDecreaseActive
                                ? "bg-blue-600"
                                : "bg-zinc-700 hover:bg-zinc-600"
                            } text-white text-xs font-bold h-5 text-center uppercase select-none px-1`}
                            style={{
                              clipPath:
                                "polygon(0 50%, 30% 0, 100% 0, 100% 100%, 30% 100%)",
                              minWidth: "3em",
                              minHeight: "1.8em",
                              fontWeight: 600,
                              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
                            }}
                            tabIndex={-1}
                          >
                            {decreaseKey || "-"}
                          </button>

                          <button
                            onMouseDown={() => handleMouseDown(increaseKey)}
                            onMouseUp={() => handleMouseUp(increaseKey)}
                            onMouseLeave={() => handleMouseUp(increaseKey)}
                            onTouchStart={() => handleMouseDown(increaseKey)}
                            onTouchEnd={() => handleMouseUp(increaseKey)}
                            className={`${
                              isIncreaseActive
                                ? "bg-blue-600"
                                : "bg-zinc-700 hover:bg-zinc-600"
                            } text-white text-xs font-semibold h-5 text-center uppercase select-none px-1`}
                            style={{
                              clipPath:
                                "polygon(100% 50%, 70% 0, 0 0, 0 100%, 70% 100%)",
                              minWidth: "3em",
                              minHeight: "1.8em",
                              fontWeight: 600,
                              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
                            }}
                            tabIndex={-1}
                          >
                            {increaseKey || "+"}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        .custom-range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .custom-range-thumb::-moz-range-thumb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .custom-range-thumb::-ms-thumb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .custom-range-thumb {
          overflow: hidden;
        }
        input[type="range"].custom-range-thumb {
          outline: none;
        }
      `}</style>
    </div>
  );
}
