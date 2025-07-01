import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import useMeasure from "react-use-measure";
import { panelStyle } from "@/components/playground/panelStyle";
import { RECORDING_INTERVAL } from "@/config/uiConfig";
import { ReplayHelpDialog } from "./ReplayHelpDialog";

interface RecordControlProps {
  show: boolean;
  onHide: () => void;
  isRecording: boolean;
  recordData: number[][];
  startRecording: () => void;
  stopRecording: () => void;
  clearRecordData: () => void;
  updateJointsDegrees?: (updates: { servoId: number; value: number }[]) => void;
  updateJointsSpeed?: (updates: { servoId: number; speed: number }[]) => void;
  jointDetails?: { servoId: number; jointType: "revolute" | "continuous" }[];
  leaderControl?: {
    isConnected: boolean;
    disconnectLeader: () => Promise<void>;
  };
}

type RecordingState = "idle" | "recording" | "paused" | "stopped" | "replaying";

const RecordControl = ({
  show,
  onHide,
  isRecording,
  recordData,
  startRecording,
  stopRecording,
  clearRecordData,
  updateJointsDegrees,
  updateJointsSpeed,
  jointDetails = [],
  leaderControl,
}: RecordControlProps) => {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [ref, bounds] = useMeasure();
  const [replayProgress, setReplayProgress] = useState(0);
  const isReplayingRef = useRef(false);

  // Sync recording state with hook
  useEffect(() => {
    if (isRecording && recordingState !== "recording") {
      setRecordingState("recording");
    }
  }, [isRecording, recordingState]);

  // Timer for recording duration
  useEffect(() => {
    if (recordingState !== "recording") return;

    const timer = setInterval(() => {
      setRecordingTime((prev) => prev + RECORDING_INTERVAL / 1000); // Convert ms to seconds
    }, RECORDING_INTERVAL);

    return () => clearInterval(timer);
  }, [recordingState]);

  useEffect(() => {
    if (bounds.height > 0) {
      setPosition({ x: 20, y: 70 });
    }
  }, [bounds.height]);

  const handleStartRecord = () => {
    setRecordingState("recording");
    setRecordingTime(0);
    startRecording();
  };

  const handlePause = () => {
    setRecordingState("paused");
    stopRecording();
  };

  const handleStop = () => {
    setRecordingState("stopped");
    stopRecording();
  };

  const handleReplay = async () => {
    if (recordData.length === 0 || !updateJointsDegrees || !updateJointsSpeed) {
      console.warn("No data to replay or missing update functions");
      return;
    }

    // 如果 leader robot 已连接，先断开连接
    if (leaderControl?.isConnected) {
      console.log("Disconnecting leader robot for replay...");
      try {
        await leaderControl.disconnectLeader();
      } catch (error) {
        console.error("Failed to disconnect leader robot:", error);
        // 即使断开失败也继续 replay
      }
    }

    setRecordingState("replaying");
    isReplayingRef.current = true;
    setReplayProgress(0);

    for (let frameIndex = 0; frameIndex < recordData.length; frameIndex++) {
      if (!isReplayingRef.current) {
        break;
      }
      const frame = recordData[frameIndex];
      const revoluteUpdates: { servoId: number; value: number }[] = [];
      const continuousUpdates: { servoId: number; speed: number }[] = [];

      // Process each joint in the frame
      jointDetails.forEach((joint, jointIndex) => {
        if (jointIndex < frame.length) {
          const value = frame[jointIndex];
          if (joint.jointType === "revolute") {
            revoluteUpdates.push({ servoId: joint.servoId, value });
          } else if (joint.jointType === "continuous") {
            continuousUpdates.push({ servoId: joint.servoId, speed: value });
          }
        }
      });

      // Apply updates
      if (revoluteUpdates.length > 0) {
        await updateJointsDegrees(revoluteUpdates);
      }
      if (continuousUpdates.length > 0) {
        await updateJointsSpeed(continuousUpdates);
      }

      setReplayProgress(frameIndex + 1);

      // Wait for the recording interval between frames to match recording timing
      if (frameIndex < recordData.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RECORDING_INTERVAL));
      }
    }

    isReplayingRef.current = false;
    setRecordingState("stopped");
    setReplayProgress(0);
  };

  const handleStopReplay = () => {
    isReplayingRef.current = false;
  };

  const handleSave = () => {
    // TODO: Implement save logic using recordData
    console.log("Saving recorded dataset...", recordData);
    // Example: download as JSON
    const dataStr = JSON.stringify(recordData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `robot_recording_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setRecordingState("idle");
    setRecordingTime(0);
    clearRecordData();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, "0")}`;
  };

  if (!show) return null;

  return (
    <Rnd
      position={position}
      onDragStop={(_, d) => setPosition({ x: d.x, y: d.y })}
      bounds="window"
      className="z-50"
      style={{ display: show ? undefined : "none" }}
    >
      <div
        ref={ref}
        className={"max-h-[90vh] overflow-y-auto text-sm " + panelStyle}
      >
        <h3 className="mt-0 mb-4 border-b border-white/50 pb-1 font-bold text-base flex justify-between items-center">
          <span>Record Dataset</span>
          <button
            className="ml-2 text-xl hover:bg-zinc-800 px-2 rounded-full"
            title="Collapse"
            onClick={onHide}
            onTouchEnd={onHide}
          >
            ×
          </button>
        </h3>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span>Duration:</span>
            <span className="font-mono">{formatTime(recordingTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Frames:</span>
            <span className="font-mono">
              {recordingState === "replaying"
                ? `${replayProgress}/${recordData.length}`
                : recordData.length}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`flex-1 px-2 py-2 rounded text-xs ${
              recordingState === "idle" || recordingState === "stopped"
                ? "bg-blue-600 hover:bg-blue-500"
                : recordingState === "paused"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-gray-700 cursor-not-allowed"
            }`}
            onClick={
              recordingState === "stopped"
                ? handleReset
                : recordingState === "paused"
                ? () => {
                    setRecordingState("recording");
                    startRecording();
                  }
                : handleStartRecord
            }
            disabled={
              recordingState === "recording" || recordingState === "replaying"
            }
          >
            {recordingState === "paused"
              ? "Resume"
              : recordingState === "stopped"
              ? "New"
              : "Start"}
          </button>

          <button
            className={`flex-1 px-2 py-2 rounded text-xs ${
              recordingState === "recording"
                ? "bg-yellow-600 hover:bg-yellow-500"
                : "bg-gray-700 cursor-not-allowed"
            }`}
            onClick={handlePause}
            disabled={recordingState !== "recording"}
          >
            Pause
          </button>

          <button
            className={`flex-1 px-2 py-2 rounded text-xs ${
              recordingState === "recording" || recordingState === "paused"
                ? "bg-red-600 hover:bg-red-500"
                : "bg-gray-700 cursor-not-allowed"
            }`}
            onClick={handleStop}
            disabled={
              recordingState === "idle" ||
              recordingState === "stopped" ||
              recordingState === "replaying"
            }
          >
            Stop
          </button>

          <div className="flex-1 flex items-center gap-2">
            <button
              className={`w-full px-2 py-2 rounded text-xs whitespace-nowrap ${
                recordingState === "stopped"
                  ? "bg-blue-600 hover:bg-blue-500"
                  : recordingState === "replaying"
                  ? "bg-orange-600 hover:bg-orange-500"
                  : "bg-gray-700 cursor-not-allowed"
              }`}
              onClick={
                recordingState === "replaying" ? handleStopReplay : handleReplay
              }
              disabled={
                recordingState !== "stopped" && recordingState !== "replaying"
              }
            >
              {recordingState === "replaying" ? "Stop Replay" : "Replay"}
            </button>
            <ReplayHelpDialog />
          </div>

          {/* <button
            className={`flex-1 px-2 py-2 rounded text-xs ${
              recordingState === "stopped"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-gray-700 cursor-not-allowed"
            }`}
            onClick={handleSave}
            disabled={recordingState !== "stopped"}
          >
            Save
          </button> */}
        </div>
      </div>
    </Rnd>
  );
};

export default RecordControl;
