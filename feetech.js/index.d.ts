export type ConnectionOptions = {
  baudRate?: number;
  protocolEnd?: number;
};

export type ServoPositions = Map<number, number> | Record<number, number>;
export type ServoSpeeds = Map<number, number> | Record<number, number>; // New type alias for speeds

export declare class ScsServoSDK {
  connect(options?: ConnectionOptions): Promise<true>;
  disconnect(): Promise<true>;
  readPosition(servoId: number): Promise<number>;
  readBaudRate(servoId: number): Promise<number>;
  readMode(servoId: number): Promise<number>;
  writePosition(servoId: number, position: number): Promise<"success">;
  writeTorqueEnable(servoId: number, enable: boolean): Promise<"success">;
  writeAcceleration(servoId: number, acceleration: number): Promise<"success">;
  setWheelMode(servoId: number): Promise<"success">;
  setPositionMode(servoId: number): Promise<"success">;
  writeWheelSpeed(servoId: number, speed: number): Promise<"success">;
  syncReadPositions(servoIds: number[]): Promise<Map<number, number>>;
  syncWritePositions(servoPositions: ServoPositions): Promise<"success">;
  syncWriteWheelSpeed(servoSpeeds: ServoSpeeds): Promise<"success">;
  setBaudRate(servoId: number, baudRateIndex: number): Promise<"success">;
  setServoId(currentServoId: number, newServoId: number): Promise<"success">;
}

export declare const scsServoSDK: ScsServoSDK;
