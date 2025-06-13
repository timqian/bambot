import React, { useState } from 'react';
import { usePolicyConnection, PolicyConfig } from '@/hooks/usePolicyConnection';

interface PolicyControlProps {
  currentJointStates: any[];
  updateJointsFunction: (updates: { servoId: number; value: number }[]) => void;
}

export function PolicyControl({ currentJointStates, updateJointsFunction }: PolicyControlProps) {
  const [taskInstruction, setTaskInstruction] = useState("Put the red cube on top of the blue cube.");
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig>({
    policy_type: "smolvla",
    pretrained_name_or_path: "lerobot/smolvla_base",
    device: "mps"
  });

  const {
    isPolicyConnected,
    connectToPolicy,
    disconnectFromPolicy,
    isGeneratingActions,
    policyStatus,
    generateActions,
    lastActionTime
  } = usePolicyConnection({
    currentJointStates,
    updateJointsFunction,
    taskInstruction
  });

  const handleConnect = () => {
    connectToPolicy(policyConfig);
  };

  const handleDisconnect = () => {
    disconnectFromPolicy();
  };

  const getStatusColor = () => {
    switch (policyStatus) {
      case "connected": return "text-green-500";
      case "connecting": return "text-yellow-500";
      case "error": case "failed": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold">Policy Control</h3>
      
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <span className={`text-sm font-mono ${getStatusColor()}`}>
          {policyStatus}
        </span>
        {isGeneratingActions && (
          <span className="text-blue-500 text-sm">Generating...</span>
        )}
      </div>

      {/* Task Instruction */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Task Instruction:
        </label>
        <input
          type="text"
          value={taskInstruction}
          onChange={(e) => setTaskInstruction(e.target.value)}
          className="w-full bg-gray-900 px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Enter task instruction..."
          disabled={isPolicyConnected}
        />
      </div>

      {/* Policy Configuration */}
      {!isPolicyConnected && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Policy Type:</label>
          <select
            value={policyConfig.policy_type}
            onChange={(e) => setPolicyConfig({...policyConfig, policy_type: e.target.value})}
            className="w-full px-3 bg-gray-900  py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="smolvla">SmolVLA</option>
            <option value="act">ACT</option>
          </select>
          
          <label className="block text-sm font-medium">Model Path:</label>
          <input
            type="text"
            value={policyConfig.pretrained_name_or_path}
            onChange={(e) => setPolicyConfig({...policyConfig, pretrained_name_or_path: e.target.value})}
            className="w-full px-3 bg-gray-900 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="lerobot/smolvla_base"
          />
          
          <label className="block text-sm font-medium">Device:</label>
          <select
            value={policyConfig.device}
            onChange={(e) => setPolicyConfig({...policyConfig, device: e.target.value})}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-300 rounded-md text-sm"
          >
            <option value="cuda">CUDA</option>
            <option value="cpu">CPU</option>
            <option value="mps">MPS</option>
          </select>
        </div>
      )}

      {/* Connection Controls */}
      <div className="flex gap-2">
        {!isPolicyConnected ? (
          <button
            onClick={handleConnect}
            disabled={policyStatus === "connecting"}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {policyStatus === "connecting" ? "Connecting..." : "Connect Policy"}
          </button>
        ) : (
          <>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
            >
              Disconnect
            </button>
            <button
              onClick={generateActions}
              disabled={isGeneratingActions}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm"
            >
              {isGeneratingActions ? "Generating..." : "Generate Action"}
            </button>
          </>
        )}
      </div>

      {/* Info */}
      {isPolicyConnected && (
        <div className="text-xs text-gray-600">
          <div>Auto-generating actions every 1 second</div>
          {lastActionTime > 0 && (
            <div>Last action: {new Date(lastActionTime).toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
} 