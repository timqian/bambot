import { useState, useCallback, useRef, useEffect } from 'react';

export interface JointState {
  name: string;
  servoId?: number;
  virtualDegrees?: number;
  position?: number; // alias for virtualDegrees for easier access
}

export interface PolicyConfig {
  policy_type: string;
  pretrained_name_or_path: string;
  device: string;
}

export interface WebObservation {
  timestamp: number;
  timestep: number;
  jointStates: Array<{ name: string; position: number }>;
  images?: { [cameraName: string]: string }; // base64 encoded images
  task: string;
  mustGo?: boolean;
}

export interface WebAction {
  timestamp: number;
  actions: Array<{
    timestamp: number;
    timestep: number;
    jointCommands: Array<{ servoId: number; targetPosition: number }>;
  }>;
}

export interface UsePolicyConnectionProps {
  currentJointStates: JointState[];
  updateJointsFunction: (updates: { servoId: number; value: number }[]) => void;
  taskInstruction?: string;
  websocketUrl?: string;
}

export function usePolicyConnection({
  currentJointStates,
  updateJointsFunction,
  taskInstruction = "move the robot",
  websocketUrl = "ws://localhost:8081"
}: UsePolicyConnectionProps) {
  const [isPolicyConnected, setIsPolicyConnected] = useState(false);
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const [policyStatus, setPolicyStatus] = useState<string>("disconnected");
  const [lastActionTime, setLastActionTime] = useState<number>(0);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const timestepRef = useRef(0);
  const isConnectedRef = useRef(false);
  
  // Store the update function in a ref so we can use it in async operations
  const updateJointsRef = useRef(updateJointsFunction);
  updateJointsRef.current = updateJointsFunction;

  // Track active interpolation to cancel when new actions arrive
  const activeInterpolationRef = useRef<NodeJS.Timeout | null>(null);

  const connectToPolicy = useCallback(async (config: PolicyConfig) => {
    if (isConnectedRef.current) {
      console.warn("Already connected to policy server");
      return;
    }

    try {
      setPolicyStatus("connecting");
      
      const ws = new WebSocket(websocketUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to bridge");
        // Send policy configuration
        ws.send(JSON.stringify({
          type: "connect_policy",
          config: config
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "policy_connection_status") {
            setIsPolicyConnected(message.connected);
            isConnectedRef.current = message.connected;
            
            if (message.connected) {
              setPolicyStatus("connected");
              console.log("Policy server connected successfully");
            } else {
              setPolicyStatus("failed");
              console.error("Failed to connect to policy server");
            }
          }
          
          else if (message.type === "actions") {
            console.log("Received actions from policy server", message.data);
            setIsGeneratingActions(false);
            const webActions: WebAction = message.data;
            // we now receive an array of actions, each with a timestamp and a list of joint positions
            
            // Convert web actions to the format expected by updateJointsFunction
            for (const webAction of webActions.actions) {
              const jointUpdates = webAction.jointCommands.map(cmd => ({
                servoId: cmd.servoId,
                value: cmd.targetPosition
              }));
            
              // Apply actions to simulation with interpolation
              if (jointUpdates.length > 0 && updateJointsRef.current) {
                // Cancel any existing interpolation
                if (activeInterpolationRef.current) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                  clearInterval(activeInterpolationRef.current);
                  activeInterpolationRef.current = null;
                }

                // Get current positions for each servo
                const interpolationData = jointUpdates.map(update => {
                  const currentJoint = currentJointStates.find(joint => joint.servoId === update.servoId);
                  const currentPosition = currentJoint?.virtualDegrees ?? currentJoint?.position ?? 0;
                  const targetPosition = update.value;
                  const positionDiff = targetPosition - currentPosition;
                  
                  return {
                    servoId: update.servoId,
                    startPosition: currentPosition,
                    targetPosition: targetPosition,
                    positionDiff: positionDiff
                  };
                });

                // Interpolation parameters
                const totalDuration = 500; // 1 second in milliseconds
                const updateInterval = 25; // 20ms intervals
                const totalSteps = totalDuration / updateInterval; // 50 steps
                let currentStep = 0;

                const interpolate = () => {
                  currentStep++;
                  const progress = Math.min(currentStep / totalSteps, 1.0); // Ensure we don't exceed 1.0
                  
                  // Use easing function for smoother motion (ease-out)
                  const easedProgress = 1 - Math.pow(1 - progress, 3);
                  
                  const interpolatedUpdates = interpolationData.map(data => ({
                    servoId: data.servoId,
                    value: data.startPosition + (data.positionDiff * easedProgress)
                  }));

                  // Apply the interpolated update
                  updateJointsRef.current(interpolatedUpdates);
                  
                  // Check if interpolation is complete
                  if (progress >= 1.0) {
                    if (activeInterpolationRef.current) {
                      clearInterval(activeInterpolationRef.current);
                      activeInterpolationRef.current = null;
                    }
                    console.log(`Completed interpolated joint commands for ${jointUpdates.length} joints`);
                  }
                };

                // Start the interpolation
                activeInterpolationRef.current = setInterval(interpolate, updateInterval);
                setLastActionTime(Date.now());
                console.log(`Starting interpolated joint commands for ${jointUpdates.length} joints over ${totalDuration}ms`);
              }
            }
          }
          
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsPolicyConnected(false);
        isConnectedRef.current = false;
        setPolicyStatus("disconnected");
        setIsGeneratingActions(false);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setPolicyStatus("error");
        setIsGeneratingActions(false);
      };

    } catch (error) {
      console.error("Failed to connect to policy server:", error);
      setPolicyStatus("error");
    }
  }, [websocketUrl]);

  const disconnectFromPolicy = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: "disconnect_policy"
      }));
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Cancel any active interpolation
    if (activeInterpolationRef.current) {
      clearInterval(activeInterpolationRef.current);
      activeInterpolationRef.current = null;
    }
    
    setIsPolicyConnected(false);
    isConnectedRef.current = false;
    setPolicyStatus("disconnected");
    setIsGeneratingActions(false);
  }, []);

  const sendObservation = useCallback(async () => {
    if (!isConnectedRef.current || !websocketRef.current || !currentJointStates) {
      return;
    }

    try {
      setIsGeneratingActions(true);
      
      // Capture image from Three.js canvas if available
      let images: { [key: string]: string } = {};
      
      // Call the global image capture function if it exists
      if (typeof window !== 'undefined' && (window as any).captureRobotImage) {
        try {
          (window as any).captureRobotImage(); // This will trigger image capture
          await new Promise(resolve => setTimeout(resolve, 100));
          // Get the captured image data
          const imageData = (window as any).getCurrentRobotImage?.();
          if (imageData && imageData.length > 0) {
            // Extract base64 data (remove data:image/jpeg;base64, prefix)
            const img = document.getElementById('robot-image') as HTMLImageElement ?? new Image();
            img.src = imageData;
            img.id = 'robot-image';
            img.style.position = 'absolute';
            img.style.bottom = '20%';
            img.style.right = '20px';
            img.style.width = '200px';
            img.style.borderRadius = '10px';
            img.style.border = '1px solid #fff';
            img.style.zIndex = '1000';
            document.body.appendChild(img);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const base64Data = imageData.split(',')[1];;
            images['observation.image'] = base64Data; // Use observation.image as expected by policy
            console.log('Captured image for observation:', base64Data.length, 'bytes');
          } else {
            console.warn('No image data captured');
          }
        } catch (error) {
          console.warn('Failed to capture image:', error);
        }
      } else {
        console.warn('No image capture function found');
      }
      if (!Object.keys(images).length) {
        console.warn('No image captured so skipping observation');
        setIsGeneratingActions(false);
        return
      }
      
      // Create observation from current joint states
      const observation: WebObservation = {
        timestamp: Date.now() / 1000, // Convert to seconds
        timestep: timestepRef.current++,
        jointStates: currentJointStates.map(joint => ({
          name: joint.name,
          position: joint.virtualDegrees ?? joint.position ?? 0
        })),
        images: Object.keys(images).length > 0 ? images : undefined, // Include images if available
        task: taskInstruction,
        mustGo: true // Always process for now
      };

      // Send observation to bridge
      websocketRef.current.send(JSON.stringify({
        type: "observation",
        data: observation
      }));
      
      console.log(`Sent observation #${observation.timestep} to policy server`, 
                  Object.keys(images).length > 0 ? 'with image' : 'without image');

    } catch (error) {
      console.error("Error sending observation:", error);
      setIsGeneratingActions(false);
    }
  }, [currentJointStates, taskInstruction]);

  const generateActions = useCallback(() => {
    sendObservation();
  }, [sendObservation]);

  // Auto-generate actions at regular intervals when connected
  useEffect(() => {
    if (!isPolicyConnected) return;

    const interval = setInterval(() => {
      if (!isGeneratingActions) {
        sendObservation();
      }
    }, 1000); // Send observation every second

    return () => clearInterval(interval);
  }, [isPolicyConnected, isGeneratingActions, sendObservation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      // Cancel any active interpolation
      if (activeInterpolationRef.current) {
        clearInterval(activeInterpolationRef.current);
        activeInterpolationRef.current = null;
      }
    };
  }, []);

  return {
    isPolicyConnected,
    connectToPolicy,
    disconnectFromPolicy,
    isGeneratingActions,
    policyStatus,
    generateActions,
    lastActionTime
  };
} 