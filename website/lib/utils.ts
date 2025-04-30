import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a servo position to an angle.
 * @param position - The servo position (0 to 4096).
 * @returns The corresponding angle (0 to 360 degrees).
 */
export function servoPositionToAngle(position: number): number {
  return (position / 4096) * 360;
}

/**
 * Converts radians to degrees.
 * @param radians - The value in radians.
 * @returns The value in degrees.
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Converts degrees to radians.
 * @param degrees - The value in degrees.
 * @returns The value in radians.
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to a servo position.
 * @param radians - The value in radians.
 * @returns The corresponding servo position (0 to 4096).
 */
export function radiansToServoPosition(radians: number): number {
  return Math.min(Math.round((radians * 4096) / (2 * Math.PI)), 4096);
}

/**
 * Converts degrees to a servo position.
 * @param degrees - The value in degrees.
 * @returns The corresponding servo position (0 to 4096).
 */
export function degreesToServoPosition(degrees: number): number {
  return Math.min(Math.round((degrees * 4096) / 360), 4096);
}
