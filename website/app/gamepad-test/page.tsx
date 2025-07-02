'use client'

import { useState, useEffect } from 'react'
import { StadiaDebugger, type RobotJoints, type GamepadState } from '@/lib/gamepadDebug'

export default function GamepadTestPage() {
  const [gamepadDebugger] = useState(() => new StadiaDebugger())
  const [isRunning, setIsRunning] = useState(false)
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [gamepadInfo, setGamepadInfo] = useState<string>('')
  const [currentJoints, setCurrentJoints] = useState<RobotJoints>({
    shoulder_pan: 0,
    shoulder_lift: 0,
    elbow_flex: 0,
    wrist_flex: 0,
    wrist_roll: 0,
    gripper: 0,
    take_photo: 0,
    end_episode: 0
  })
  const [logs, setLogs] = useState<string[]>([])
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${message}`])
  }
  
  const checkGamepad = () => {
    const gamepad = gamepadDebugger.detectGamepad()
    if (gamepad) {
      setGamepadConnected(true)
      const isStadia = gamepadDebugger.isStadiaController(gamepad)
      setGamepadInfo(`${gamepad.id} ${isStadia ? '(Stadia ✅)' : '(⚠️ Non-Stadia)'}`)
      return gamepad
    } else {
      setGamepadConnected(false)
      setGamepadInfo('')
      return null
    }
  }
  
  const startDebug = () => {
    if (isRunning) {
      gamepadDebugger.stop()
      setIsRunning(false)
      addLog('Debug stopped')
      return
    }
    
    const gamepad = checkGamepad()
    if (!gamepad) {
      addLog('No gamepad detected! Connect Stadia controller and press any button.')
      return
    }
    
    gamepadDebugger.start((joints: RobotJoints, state: GamepadState) => {
      setCurrentJoints(joints)
      
      // Log significant changes
      const activeJoints = Object.entries(joints)
        .filter(([_, value]) => Math.abs(value) > 0.01)
        .map(([joint, value]) => `${joint}: ${value.toFixed(3)}`)
      
      if (activeJoints.length > 0) {
        addLog(`Robot: ${activeJoints.join(', ')}`)
      }
    })
    
    setIsRunning(true)
    addLog('Debug started - move controls to test mapping')
  }
  
  const clearLogs = () => {
    setLogs([])
  }
  
  const runQuickTest = () => {
    const gamepad = checkGamepad()
    if (gamepad) {
      gamepadDebugger.logGamepadInfo(gamepad)
      gamepadDebugger.printMappingReference()
      addLog('Check browser console for detailed gamepad info and mapping reference')
    } else {
      addLog('No gamepad detected for quick test')
    }
  }
  
  useEffect(() => {
    // Check gamepad periodically
    const interval = setInterval(checkGamepad, 1000)
    
    // Listen for gamepad events
    const handleConnect = (e: GamepadEvent) => {
      addLog(`Gamepad connected: ${e.gamepad.id}`)
      checkGamepad()
    }
    
    const handleDisconnect = (e: GamepadEvent) => {
      addLog(`Gamepad disconnected: ${e.gamepad.id}`)
      setGamepadConnected(false)
      setGamepadInfo('')
    }
    
    window.addEventListener('gamepadconnected', handleConnect)
    window.addEventListener('gamepaddisconnected', handleDisconnect)
    
    // Initial check
    checkGamepad()
    addLog('Stadia Controller Test initialized')
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('gamepadconnected', handleConnect)
      window.removeEventListener('gamepaddisconnected', handleDisconnect)
      gamepadDebugger.stop()
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-900 text-green-400 p-6 font-mono">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 border-b border-green-400 pb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎮 Stadia Controller Test
          </h1>
          <p className="text-gray-300">SO101 Robot Mapping Debug Tool</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Connection Status */}
          <div className={`border rounded-lg p-6 ${gamepadConnected ? 'border-green-400 bg-green-900/20' : 'border-red-400 bg-red-900/20'}`}>
            <h2 className="text-xl font-bold mb-4">Connection Status</h2>
            <div className="space-y-2">
              <div className={`text-lg ${gamepadConnected ? 'text-green-400' : 'text-red-400'}`}>
                {gamepadConnected ? '✅ Connected' : '❌ Disconnected'}
              </div>
              {gamepadInfo && (
                <div className="text-sm text-gray-300 break-all">
                  {gamepadInfo}
                </div>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="border border-gray-600 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Controls</h2>
            <div className="space-y-3">
              <button
                onClick={startDebug}
                disabled={!gamepadConnected}
                className={`w-full py-2 px-4 rounded font-bold ${
                  isRunning 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:text-gray-400'
                }`}
              >
                {isRunning ? 'Stop Debug' : 'Start Debug'}
              </button>
              
              <button
                onClick={runQuickTest}
                disabled={!gamepadConnected}
                className="w-full py-2 px-4 rounded font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:text-gray-400"
              >
                Quick Test (Check Console)
              </button>
              
              <button
                onClick={clearLogs}
                className="w-full py-2 px-4 rounded font-bold bg-gray-600 hover:bg-gray-700 text-white"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
        
        {/* Robot Joint States */}
        <div className="border border-gray-600 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">🤖 SO101 Robot Joint States</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(currentJoints).map(([joint, value]) => (
              <div key={joint} className="bg-gray-800 rounded p-3">
                <div className="text-sm text-gray-300 mb-1">
                  {joint.replace('_', ' ').toUpperCase()}
                </div>
                <div className={`text-lg font-bold ${Math.abs(value) > 0.01 ? 'text-green-400' : 'text-gray-500'}`}>
                  {value.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Mapping Reference */}
        <div className="border border-gray-600 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-cyan-400">🗺️ Stadia Controller Mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold mb-3 text-yellow-400">Primary Controls</h3>
              <ul className="space-y-1 text-sm">
                <li><span className="text-white">Left Stick X:</span> Wrist Roll</li>
                <li><span className="text-white">Left Stick Y:</span> Wrist Flex</li>
                <li><span className="text-white">Right Stick X:</span> Shoulder Pan</li>
                <li><span className="text-white">Right Stick Y:</span> Shoulder Lift</li>
                <li><span className="text-white">L2 Trigger:</span> Close Gripper</li>
                <li><span className="text-white">R2 Trigger:</span> Open Gripper</li>
                <li><span className="text-white">L1 Bumper:</span> Elbow Down</li>
                <li><span className="text-white">R1 Bumper:</span> Elbow Up</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-3 text-yellow-400">Alternative Controls</h3>
              <ul className="space-y-1 text-sm">
                <li><span className="text-white">A Button:</span> Wrist Down</li>
                <li><span className="text-white">Y Button:</span> Wrist Up</li>
                <li><span className="text-white">X Button:</span> Wrist Left</li>
                <li><span className="text-white">B Button:</span> Wrist Right</li>
                <li><span className="text-white">D-Pad Up:</span> Shoulder Up</li>
                <li><span className="text-white">D-Pad Down:</span> Shoulder Down</li>
                <li><span className="text-white">D-Pad Left:</span> Shoulder Left</li>
                <li><span className="text-white">D-Pad Right:</span> Shoulder Right</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Debug Log */}
        <div className="border border-gray-600 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📝 Debug Log</h2>
          <div className="bg-black rounded p-4 h-64 overflow-y-auto text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="border border-yellow-400 rounded-lg p-6 mt-6 bg-yellow-900/10">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">📋 Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Connect your Stadia controller via Bluetooth to your Mac</li>
            <li>Press any button on the controller to activate it</li>
            <li>Click "Start Debug" to begin live testing</li>
            <li>Test each control and verify the robot joint values change correctly</li>
            <li>Use "Quick Test" to see detailed info in browser console</li>
            <li>Check that mapping matches your SO101 documentation</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-400 rounded">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> This test page verifies your Stadia controller mapping before integrating 
              into the main robot control system. All values should match your pro2robot Python documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}